import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, patchJson, postJson } from "../lib/api";
import { DEFAULT_OVERHEAD_RULES, removeOverheadFromLoadedCost } from "../lib/overheadRules";
import { activeMasterItems, optionLabel, optionValue } from "../lib/masters";
import { DataTable, Field, Section } from "../components.jsx";
import { PageShell, SaveBar } from "./FormPages.jsx";

function activeSkills(skills) {
  return skills.filter((skill) => skill.active !== false);
}

function activeSubModules(skill) {
  return (skill?.subModules || []).filter((subModule) => typeof subModule === "string" || subModule.active !== false);
}

function subModuleName(subModule) {
  return typeof subModule === "string" ? subModule : subModule?.value || subModule?.name || subModule?.code || "";
}

function activeExperienceLevels(levels) {
  return levels.filter((level) => level.active !== false);
}

function addWeeksAndSubtractDay(value, duration) {
  if (!value || !duration) {
    return "";
  }
  const start = new Date(value);
  const result = new Date(start);
  result.setDate(result.getDate() + Number(duration) * 7);
  result.setDate(result.getDate() - 1);
  return result.toISOString().slice(0, 10);
}

function weekSpanInclusive(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.round(diffDays / 7));
}

function deriveCostGuidance(billRate, targetMargin, rules = DEFAULT_OVERHEAD_RULES, engagementType = "Full-Time", locationType = "Offshore") {
  const rate = Number(billRate || 0);
  const margin = Number(targetMargin || 0);
  const loadedCostGuidance = Number((rate * (1 - margin / 100)).toFixed(2));
  const baseCostGuidance = removeOverheadFromLoadedCost(loadedCostGuidance, rules, engagementType, locationType);
  return {
    targetMargin: margin,
    loadedCostGuidance,
    baseCostGuidance
  };
}

function defaultTargetMarginForLocation(locationType) {
  return locationType === "Onsite" ? 30 : 40;
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function availabilityMatch(resource, roleStartDate) {
  const roleStart = roleStartDate ? new Date(roleStartDate) : null;
  if (!roleStart || Number.isNaN(roleStart.getTime())) {
    return true;
  }

  const availabilityDate = resource.availabilityDate ? new Date(resource.availabilityDate) : null;
  if (availabilityDate && !Number.isNaN(availabilityDate.getTime()) && availabilityDate > roleStart) {
    return false;
  }

  const notAvailableFrom = resource.notAvailableFrom ? new Date(resource.notAvailableFrom) : null;
  const notAvailableTo = resource.notAvailableTo ? new Date(resource.notAvailableTo) : null;
  if (
    notAvailableFrom &&
    notAvailableTo &&
    !Number.isNaN(notAvailableFrom.getTime()) &&
    !Number.isNaN(notAvailableTo.getTime()) &&
    roleStart >= notAvailableFrom &&
    roleStart <= notAvailableTo
  ) {
    return false;
  }

  return true;
}

function matchCandidates(resources, roleForm) {
  return resources
    .map((resource) => {
      const fullName = `${resource.firstName || ""} ${resource.lastName || ""}`.trim();
      const skillMatch = resource.primarySkill === roleForm.skill;
      const subModuleMatch = !roleForm.subModule || resource.subModule === roleForm.subModule || (resource.primarySubModules || []).includes(roleForm.subModule);
      const locationMatch = (resource.locationType || "Offshore") === roleForm.locationRequirement;
      const startDateMatch = availabilityMatch(resource, roleForm.startDate);
      const availablePercent = Number(resource.currentAvailablePercent ?? Math.max(0, 100 - Number(resource.deployedPercent || 0)));
      const allocationMatch = availablePercent >= Number(roleForm.plannedAllocationPercent || 0);
      const isActive = (resource.employmentStatus || "ACTIVE") === "ACTIVE";
      const isEligible = isActive && skillMatch && subModuleMatch && locationMatch && startDateMatch && allocationMatch;
      if (!isEligible) {
        return null;
      }

      return {
        id: resource.id,
        name: fullName || resource.number,
        module: resource.primarySkill || "-",
        availability: resource.availabilityDate ? formatDate(resource.availabilityDate) : "Now",
        availablePercent: `${availablePercent}%`,
        status: resource.currentDeliveryStatusLabel || resource.deliveryStatus || "AVAILABLE"
      };
    })
    .filter(Boolean);
}

export function OpportunityRoleFormPage() {
  const { id, roleId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(roleId);
  const { data: opportunity, isLoading: isOpportunityLoading, error: opportunityError } = useQuery({ queryKey: ["opportunity", id], queryFn: () => apiFetch(`/opportunities/${id}`) });
  const { data: skills = [], error: skillsError } = useQuery({ queryKey: ["admin", "skills"], queryFn: () => apiFetch("/admin/skills") });
  const { data: experienceLevels = [], error: experienceLevelsError } = useQuery({ queryKey: ["admin", "experienceLevels"], queryFn: () => apiFetch("/admin/experienceLevels") });
  const { data: masters = [] } = useQuery({ queryKey: ["admin", "masterDataItems"], queryFn: () => apiFetch("/admin/masterDataItems") });
  const { data: overheadRules = DEFAULT_OVERHEAD_RULES } = useQuery({ queryKey: ["admin", "overhead-rules"], queryFn: () => apiFetch("/admin/overhead-rules") });
  const role = opportunity?.roles?.find((item) => item.id === roleId);

  const [form, setForm] = useState({
    opportunityId: id,
    title: "",
    skill: "SAP FICO",
    subModule: "",
    engagementType: "Full-Time",
    experienceLevel: "Consultant",
    startDate: "",
    duration: 1,
    endDate: "",
    roleLocation: "Offshore",
    estimatedHours: 0,
    billRate: 0,
    targetMargin: 40,
    loadedCostGuidance: 0,
    baseCostGuidance: 0,
    allocationPercent: 100,
    resourceIdentificationStatus: "Unidentified",
    notes: ""
  });

  useEffect(() => {
    if (role) {
      const targetMargin = role.targetMargin ?? opportunity?.targetMargin ?? 0;
      const costing = deriveCostGuidance(role.billRate, targetMargin, overheadRules, role.engagementType || "Full-Time", role.roleLocation || "Offshore");
      setForm({
        opportunityId: id,
        title: role.title || "",
        skill: role.skill || "SAP FICO",
        subModule: role.subModule || "",
        engagementType: role.engagementType || "Full-Time",
        experienceLevel: role.experienceLevel || "Consultant",
        startDate: String(role.startDate || "").slice(0, 10),
        duration: role.duration ?? weekSpanInclusive(role.startDate, role.endDate) ?? 1,
        endDate: String(role.endDate || "").slice(0, 10),
        roleLocation: role.roleLocation || "Offshore",
        estimatedHours: role.estimatedHours ?? 0,
        billRate: role.billRate ?? 0,
        targetMargin,
        loadedCostGuidance: role.loadedCostGuidance ?? costing.loadedCostGuidance,
        baseCostGuidance: role.baseCostGuidance ?? costing.baseCostGuidance,
        allocationPercent: role.allocationPercent ?? 100,
        resourceIdentificationStatus: role.resourceIdentificationStatus || "Unidentified",
        notes: role.notes || ""
      });
      return;
    }

    if (opportunity) {
      setForm((current) => {
        const defaultTargetMargin = defaultTargetMarginForLocation(current.roleLocation);
        const costing = deriveCostGuidance(0, defaultTargetMargin, overheadRules, current.engagementType || "Full-Time", current.roleLocation || "Offshore");
        return {
          ...current,
          opportunityId: id,
          targetMargin: defaultTargetMargin,
          loadedCostGuidance: costing.loadedCostGuidance,
          baseCostGuidance: costing.baseCostGuidance
        };
      });
    }
  }, [role, opportunity, id, overheadRules]);

  useEffect(() => {
    setForm((current) => {
      const costing = deriveCostGuidance(current.billRate, current.targetMargin, overheadRules, current.engagementType, current.roleLocation);
      if (
        costing.loadedCostGuidance === current.loadedCostGuidance &&
        costing.baseCostGuidance === current.baseCostGuidance
      ) {
        return current;
      }
      return {
        ...current,
        loadedCostGuidance: costing.loadedCostGuidance,
        baseCostGuidance: costing.baseCostGuidance
      };
    });
  }, [form.billRate, form.targetMargin, form.engagementType, form.roleLocation, overheadRules]);

  const skill = activeSkills(skills).find((item) => item.name === form.skill);
  const locationTypes = activeMasterItems(masters, "locationType").filter((item) => ["Offshore", "Onsite"].includes(optionValue(item)));
  const engagementTypes = activeMasterItems(masters, "engagementType");

  if (isOpportunityLoading) {
    return <div className="loading">Loading opportunity role...</div>;
  }
  if (opportunityError || skillsError || experienceLevelsError) {
    return <div className="error-banner">Unable to load the role screen.</div>;
  }
  if (!opportunity) {
    return <div className="error-banner">Opportunity not found.</div>;
  }
  if (isEdit && !role) {
    return <div className="error-banner">Opportunity role not found.</div>;
  }

  async function save(event) {
    event.preventDefault();
    if (isEdit) {
      await patchJson(`/children/opportunityRoles/${roleId}`, form);
    } else {
      await postJson("/children/opportunityRoles", form);
    }
    navigate(`/opportunities/${id}`);
  }

  return (
    <PageShell
      eyebrow="Pipeline Role"
      title={isEdit ? "Edit Opportunity Role" : "Add Opportunity Role"}
      subtitle={`Define demand, commercial guidance, and timing for ${opportunity?.name || "the opportunity"}. Resource assignment starts only after SOW creation.`}
    >
      <form onSubmit={save}>
        <Section title="Role Details">
          <div className="form-grid two-up">
            <Field label="Role Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
            <Field label="SAP Module">
              <select value={form.skill} onChange={(event) => setForm({ ...form, skill: event.target.value, subModule: "" })}>
                {activeSkills(skills).map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
              </select>
            </Field>
            <Field label="SAP Sub-Module">
              <select value={form.subModule} onChange={(event) => setForm({ ...form, subModule: event.target.value })}>
                <option value="">Select</option>
                {activeSubModules(skill).map((subModule) => {
                  const value = subModuleName(subModule);
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
            </Field>
            <Field label="Role Location">
                  <select value={form.roleLocation} onChange={(event) => setForm({ ...form, roleLocation: event.target.value, targetMargin: defaultTargetMarginForLocation(event.target.value) })}>
                {locationTypes.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="Engagement Type">
              <select value={form.engagementType} onChange={(event) => setForm({ ...form, engagementType: event.target.value })}>
                {engagementTypes.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="Experience Level">
              <select value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value })}>
                {activeExperienceLevels(experienceLevels).map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
              </select>
            </Field>
            <Field label="Resource Identification Status">
              <select value={form.resourceIdentificationStatus} onChange={(event) => setForm({ ...form, resourceIdentificationStatus: event.target.value })}>
                <option value="Unidentified">Unidentified</option>
                <option value="In Review">In Review</option>
                <option value="Ready for Conversion">Ready for Conversion</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Timeline and Commercials">
          <div className="form-grid two-up">
            <Field label="Start Date">
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({
                  ...form,
                  startDate: event.target.value,
                  endDate: form.duration ? addWeeksAndSubtractDay(event.target.value, form.duration) : form.endDate
                })}
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value, duration: weekSpanInclusive(form.startDate, event.target.value) || form.duration })}
              />
            </Field>
            <Field label="Duration (Weeks)">
              <input
                type="number" step="any"
                min="1"
                value={form.duration}
                onChange={(event) => setForm({
                  ...form,
                  duration: event.target.value,
                  endDate: form.startDate ? addWeeksAndSubtractDay(form.startDate, event.target.value) : form.endDate
                })}
              />
            </Field>
            <Field label="Estimated Hours (Per Resource)"><input type="number" step="any" min="0" value={form.estimatedHours} onChange={(event) => setForm({ ...form, estimatedHours: event.target.value })} /></Field>
            <Field label="Bill Rate"><input type="number" step="any" min="0" value={form.billRate} onChange={(event) => setForm({ ...form, billRate: event.target.value })} /></Field>
            <Field label="Target Margin %"><input type="number" step="any" min="0" max="100" value={form.targetMargin} onChange={(event) => setForm({ ...form, targetMargin: event.target.value })} /></Field>
            <Field label="Loaded Cost Guidance"><input value={form.loadedCostGuidance} readOnly /></Field>
            <Field label="Base Cost Guidance"><input value={form.baseCostGuidance} readOnly /></Field>
            <Field label="Allocation %"><input type="number" step="any" min="0" max="150" value={form.allocationPercent} onChange={(event) => setForm({ ...form, allocationPercent: event.target.value })} /></Field>
            <Field label="Notes"><textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          </div>
        </Section>
        <SaveBar backTo={`/opportunities/${id}`} label="Save Role" />
      </form>
    </PageShell>
  );
}

export function SowRoleFormPage() {
  const { id, roleId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(roleId);
  const isAssign = window.location.pathname.endsWith("/assign");
  const { data: sow, isLoading: isSowLoading, error: sowError } = useQuery({ queryKey: ["sow", id], queryFn: () => apiFetch(`/sows/${id}`) });
  const { data: skills = [], error: skillsError } = useQuery({ queryKey: ["admin", "skills"], queryFn: () => apiFetch("/admin/skills") });
  const { data: experienceLevels = [], error: experienceLevelsError } = useQuery({ queryKey: ["admin", "experienceLevels"], queryFn: () => apiFetch("/admin/experienceLevels") });
  const { data: masters = [] } = useQuery({ queryKey: ["admin", "masterDataItems"], queryFn: () => apiFetch("/admin/masterDataItems") });
  const { data: resources = [], error: resourcesError } = useQuery({ queryKey: ["resources"], queryFn: () => apiFetch("/resources") });
  const { data: overheadRules = DEFAULT_OVERHEAD_RULES } = useQuery({ queryKey: ["admin", "overhead-rules"], queryFn: () => apiFetch("/admin/overhead-rules") });
  const role = sow?.roles?.find((item) => item.id === roleId);
  const [assignedResourceId, setAssignedResourceId] = useState("");
  const [form, setForm] = useState({
    sowId: id,
    title: "",
    skill: "SAP FICO",
    subModule: "",
    engagementType: "Full-Time",
    experienceLevel: "Consultant",
    billingType: "Hourly",
    billRate: 0,
    targetMargin: 40,
    loadedCostGuidance: 0,
    baseCostGuidance: 0,
    startDate: "",
    duration: 1,
    endDate: "",
    plannedAllocationPercent: 100,
    plannedHours: 0,
    locationRequirement: "Offshore",
    staffingPriority: "High",
    staffingStatus: "Open",
    remarks: "",
    measurementUnit: "HOURS"
  });

  useEffect(() => {
    if (role) {
      const targetMargin = role.targetMargin ?? sow?.targetMargin ?? 0;
      const costing = deriveCostGuidance(role.billRate, targetMargin, overheadRules, role.engagementType || "Full-Time", role.locationRequirement || "Offshore");
      setForm({
        sowId: id,
        title: role.title || "",
        skill: role.skill || "SAP FICO",
        subModule: role.subModule || "",
        engagementType: role.engagementType || "Full-Time",
        experienceLevel: role.experienceLevel || "Consultant",
        billingType: role.billingType || "Hourly",
        billRate: role.billRate ?? 0,
        targetMargin,
        loadedCostGuidance: role.loadedCostGuidance ?? costing.loadedCostGuidance,
        baseCostGuidance: role.baseCostGuidance ?? costing.baseCostGuidance,
        startDate: String(role.startDate || "").slice(0, 10),
        duration: role.duration ?? weekSpanInclusive(role.startDate, role.endDate) ?? 1,
        endDate: String(role.endDate || "").slice(0, 10),
        plannedAllocationPercent: role.plannedAllocationPercent ?? 100,
        plannedHours: role.plannedHours ?? 0,
        locationRequirement: role.locationRequirement || "Offshore",
        staffingPriority: role.staffingPriority || "High",
        staffingStatus: role.staffingStatus || "Open",
        remarks: role.remarks || "",
        measurementUnit: role.measurementUnit || "HOURS"
      });
      return;
    }

    if (sow) {
      setForm((current) => {
        const targetMargin = defaultTargetMarginForLocation(current.locationRequirement);
        const costing = deriveCostGuidance(0, targetMargin, overheadRules, current.engagementType || "Full-Time", current.locationRequirement || "Offshore");
        return {
          ...current,
          sowId: id,
          targetMargin,
          loadedCostGuidance: costing.loadedCostGuidance,
          baseCostGuidance: costing.baseCostGuidance
        };
      });
    }
  }, [role, sow, id, overheadRules]);

  useEffect(() => {
    setForm((current) => {
      const costing = deriveCostGuidance(current.billRate, current.targetMargin, overheadRules, current.engagementType, current.locationRequirement);
      if (
        costing.loadedCostGuidance === current.loadedCostGuidance &&
        costing.baseCostGuidance === current.baseCostGuidance
      ) {
        return current;
      }
      return {
        ...current,
        loadedCostGuidance: costing.loadedCostGuidance,
        baseCostGuidance: costing.baseCostGuidance
      };
    });
  }, [form.billRate, form.targetMargin, form.engagementType, form.locationRequirement, overheadRules]);

  const skill = activeSkills(skills).find((item) => item.name === form.skill);
  const candidateResources = useMemo(() => matchCandidates(resources, form), [resources, form]);
  const locationTypes = activeMasterItems(masters, "locationType").filter((item) => ["Offshore", "Onsite"].includes(optionValue(item)));
  const engagementTypes = activeMasterItems(masters, "engagementType");
  const billingTypes = activeMasterItems(masters, "billingType");
  const measurementUnits = activeMasterItems(masters, "measurementUnit");
  const staffingPriorities = activeMasterItems(masters, "staffingPriority");

  if (isSowLoading) {
    return <div className="loading">Loading SOW role...</div>;
  }
  if (sowError || skillsError || experienceLevelsError || resourcesError) {
    return <div className="error-banner">Unable to load the SOW role screen.</div>;
  }
  if (!sow) {
    return <div className="error-banner">SOW not found.</div>;
  }
  if ((isEdit || isAssign) && !role) {
    return <div className="error-banner">SOW role not found.</div>;
  }

  async function save(event) {
    event.preventDefault();
    const { staffingStatus: _staffingStatus, ...rolePayload } = form;
    const savedRole = isEdit
      ? await patchJson(`/children/sowRoles/${roleId}`, rolePayload)
      : await postJson("/children/sowRoles", rolePayload);

    if (assignedResourceId) {
      const resource = resources.find((item) => item.id === assignedResourceId);
      await postJson("/children/deployments", {
        sowRoleId: savedRole.id,
        resourceId: assignedResourceId,
        startDate: form.startDate || String(sow?.startDate || "").slice(0, 10),
        endDate: form.endDate || String(sow?.endDate || "").slice(0, 10),
        allocationPercent: Number(form.plannedAllocationPercent || 100),
        status: "ACTIVE",
        lockedCostRate: Number(resource?.costRate || 0),
        lockedBillRate: Number(form.billRate || 0),
        billable: true,
        sourceOfAssignment: "SOW Role Assignment"
      });
    }

    navigate(`/sows/${id}`);
  }

  return (
    <PageShell
      eyebrow="SOW Role"
      title={isAssign ? "Assign Resource to SOW Role" : isEdit ? "Edit SOW Role" : "Add SOW Role"}
      subtitle={`Define final delivery roles for ${sow?.name || "the SOW"} and assign resources only at SOW stage.`}
    >
      <form onSubmit={save}>
        {!isAssign ? (
          <>
            <Section title="Role Details">
              <div className="form-grid two-up">
                <Field label="Role Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
                <Field label="SAP Module">
                  <select value={form.skill} onChange={(event) => setForm({ ...form, skill: event.target.value, subModule: "" })}>
                    {activeSkills(skills).map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
                  </select>
                </Field>
                <Field label="SAP Sub-Module">
                  <select value={form.subModule} onChange={(event) => setForm({ ...form, subModule: event.target.value })}>
                    <option value="">Select</option>
                    {activeSubModules(skill).map((subModule) => {
                      const value = subModuleName(subModule);
                      return <option key={value} value={value}>{value}</option>;
                    })}
                  </select>
                </Field>
                <Field label="Role Location">
                  <select value={form.locationRequirement} onChange={(event) => setForm({ ...form, locationRequirement: event.target.value, targetMargin: defaultTargetMarginForLocation(event.target.value) })}>
                    {locationTypes.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
                  </select>
                </Field>
                <Field label="Engagement Type">
                  <select value={form.engagementType} onChange={(event) => setForm({ ...form, engagementType: event.target.value })}>
                    {engagementTypes.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
                  </select>
                </Field>
                <Field label="Experience Level">
                  <select value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value })}>
                    {activeExperienceLevels(experienceLevels).map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
                  </select>
                </Field>
                <Field label="Billing Type">
                  <select value={form.billingType} onChange={(event) => setForm({ ...form, billingType: event.target.value })}>
                    {billingTypes.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
                  </select>
                </Field>
                <Field label="Measurement Unit">
                  <select value={form.measurementUnit} onChange={(event) => setForm({ ...form, measurementUnit: event.target.value })}>
                    {measurementUnits.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
                  </select>
                </Field>
                <Field label="Staffing Priority">
                  <select value={form.staffingPriority} onChange={(event) => setForm({ ...form, staffingPriority: event.target.value })}>
                    {staffingPriorities.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Timeline and Commercials">
              <div className="form-grid two-up">
                <Field label="Start Date">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm({
                      ...form,
                      startDate: event.target.value,
                      endDate: form.duration ? addWeeksAndSubtractDay(event.target.value, form.duration) : form.endDate
                    })}
                  />
                </Field>
                <Field label="End Date">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm({ ...form, endDate: event.target.value, duration: weekSpanInclusive(form.startDate, event.target.value) || form.duration })}
                  />
                </Field>
                <Field label="Duration (Weeks)">
                  <input
                    type="number" step="any"
                    min="1"
                    value={form.duration}
                    onChange={(event) => setForm({
                      ...form,
                      duration: event.target.value,
                      endDate: form.startDate ? addWeeksAndSubtractDay(form.startDate, event.target.value) : form.endDate
                    })}
                  />
                </Field>
                <Field label="Planned Allocation %"><input type="number" step="any" min="0" max="150" value={form.plannedAllocationPercent} onChange={(event) => setForm({ ...form, plannedAllocationPercent: event.target.value })} /></Field>
                <Field label="Planned Hours (Per Resource)"><input type="number" step="any" min="0" value={form.plannedHours} onChange={(event) => setForm({ ...form, plannedHours: event.target.value })} /></Field>
                <Field label="Bill Rate"><input type="number" step="any" min="0" value={form.billRate} onChange={(event) => setForm({ ...form, billRate: event.target.value })} /></Field>
                <Field label="Target Margin %"><input type="number" step="any" min="0" max="100" value={form.targetMargin} onChange={(event) => setForm({ ...form, targetMargin: event.target.value })} /></Field>
                <Field label="Loaded Cost Guidance"><input value={form.loadedCostGuidance} readOnly /></Field>
                <Field label="Base Cost Guidance"><input value={form.baseCostGuidance} readOnly /></Field>
                <Field label="Remarks"><textarea rows="3" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></Field>
              </div>
            </Section>
          </>
        ) : null}

        <Section title="Resource Assignment">
          <div className="form-grid">
            <Field label="Assign Resource">
              <select value={assignedResourceId} onChange={(event) => setAssignedResourceId(event.target.value)}>
                <option value="">Select</option>
                {candidateResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} / {resource.module} / {form.locationRequirement}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="assignment-matches">
            <div className="section-header">
              <h2>Candidate Resource Matching</h2>
            </div>
            <p className="muted">
              Showing only resources that match module, location, and project start-date availability for this role.
            </p>
            <DataTable
              columns={[
                { key: "name", label: "Resource" },
                { key: "module", label: "SAP Module" },
                { key: "availability", label: "Available From" },
                { key: "availablePercent", label: "Available %" },
                { key: "status", label: "Delivery Status" }
              ]}
              rows={candidateResources}
            />
          </div>
        </Section>
        <SaveBar backTo={`/sows/${id}`} label={isAssign ? "Save and Assign" : "Save Role"} />
      </form>
    </PageShell>
  );
}
