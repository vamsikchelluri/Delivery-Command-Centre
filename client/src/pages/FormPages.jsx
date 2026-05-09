import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, patchJson, postJson } from "../lib/api";
import { canEditResourceCost, canViewResourceCost, currentUser } from "../lib/permissions";
import { DEFAULT_OVERHEAD_RULES, applyOverheadToBaseCost, findOverheadRule } from "../lib/overheadRules";
import { DataTable, Field, Section } from "../components.jsx";

export function SaveBar({ backTo, label }) {
  return (
    <div className="save-bar">
      <Link className="secondary-button as-link" to={backTo}>Cancel</Link>
      <button type="submit">{label}</button>
    </div>
  );
}

export function PageShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="workspace form-screen">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

function usersByRole(users, roleName) {
  return users.filter((user) => user.role === roleName);
}

function usersByDeliveryRole(users, deliveryRole, legacyRoleName) {
  return users.filter((user) =>
    (user.deliveryRoles || []).includes(deliveryRole) ||
    (!user.deliveryRoles?.length && user.role === legacyRoleName)
  );
}

function activeSkills(skills) {
  return skills.filter((skill) => skill.active !== false);
}

function activeSubModules(skill) {
  return (skill?.subModules || []).filter((subModule) => typeof subModule === "string" || subModule.active !== false);
}

function subModuleName(subModule) {
  return typeof subModule === "string" ? subModule : subModule?.value || subModule?.name || subModule?.code || "";
}

function allowedCompensationTypes(locationType, employmentType) {
  if (locationType === "Offshore" && employmentType === "C2C") {
    return ["Annual CTC", "Hourly Rate", "Monthly Rate"];
  }
  if (locationType === "Offshore" && ["Full-Time", "Part-Time"].includes(employmentType)) {
    return ["Annual CTC", "Hourly Rate", "Monthly Rate"];
  }
  if (locationType === "Onsite" && ["Full-Time", "Part-Time"].includes(employmentType)) {
    return ["Annual Salary", "Hourly Rate", "Monthly Rate"];
  }
  return ["Hourly Rate", "Monthly Rate"];
}

function defaultLocationForType(locations, locationType) {
  const targets = {
    Offshore: ["india"],
    Onsite: ["usa", "united states", "us"],
    Nearshore: ["canada"]
  };
  const accepted = targets[locationType] || [];
  return locations.find((location) =>
    location.active !== false &&
    location.locationType === locationType &&
    accepted.some((target) => String(location.name || "").toLowerCase().includes(target))
  ) || locations.find((location) => location.active !== false && location.locationType === locationType);
}

function overheadRuleLabel(rule, engagementType, locationType) {
  const percent = Number(rule?.overheadPercent || 0);
  const hourlyAddOn = Number(rule?.hourlyAddOn || 0);
  return `${engagementType || "Default"} / ${locationType || "Default"}: ${percent}% + $${hourlyAddOn}/hr`;
}

export function AccountFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => apiFetch("/accounts") });
  const { data: regions = [] } = useQuery({ queryKey: ["admin", "regions"], queryFn: () => apiFetch("/admin/regions") });
  const record = accounts.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState("Client Details");
  const [form, setForm] = useState({ name: "", status: "ACTIVE", industry: "", region: "", contactPerson: "", contactEmail: "", contactPhone: "", notes: "" });
  const regionOptions = regions.filter((region) => region.active !== false).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  useEffect(() => {
    if (record) {
      setForm({
        name: record.name || "",
        status: record.status || "ACTIVE",
        industry: record.industry || "",
        region: record.region || "",
        contactPerson: record.contactPerson || "",
        contactEmail: record.contactEmail || "",
        contactPhone: record.contactPhone || "",
        notes: record.notes || ""
      });
    }
  }, [record]);

  async function save(event) {
    event.preventDefault();
    if (isEdit) await patchJson(`/accounts/${id}`, form);
    else await postJson("/accounts", form);
    navigate("/accounts");
  }

  return (
    <PageShell eyebrow="Client Master" title={isEdit ? `Edit Client ${record?.number || ""}` : "Create Client"} subtitle="Maintain client, industry, region, and primary contact details.">
      <form onSubmit={save}>
        <div className="tabs" role="tablist">
          <button className={activeTab === "Client Details" ? "tab active" : "tab"} onClick={() => setActiveTab("Client Details")} type="button">Client Details</button>
        </div>
        {activeTab === "Client Details" ? (
          <Section title="Client Details">
            <div className="form-grid two-up">
              <Field label="Client Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
              <Field label="Client Status">
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </Field>
              <Field label="Industry"><input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} /></Field>
              <Field label="Region">
                <select value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
                  <option value="">Select</option>
                  {regionOptions.map((region) => <option key={region.id} value={region.name}>{region.name}</option>)}
                </select>
              </Field>
              <Field label="Contact Person"><input value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></Field>
              <Field label="Contact Email"><input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></Field>
              <Field label="Contact Phone"><input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></Field>
              <Field label="Notes"><textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          </Section>
        ) : null}
        <SaveBar backTo="/accounts" label="Save Client" />
      </form>
    </PageShell>
  );
}

export function ResourceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const user = currentUser();
  const canViewCost = canViewResourceCost(user);
  const canEditCost = canEditResourceCost(user);
  const { data: resources = [] } = useQuery({ queryKey: ["resources"], queryFn: () => apiFetch("/resources") });
  const { data: skills = [] } = useQuery({ queryKey: ["admin", "skills"], queryFn: () => apiFetch("/admin/skills") });
  const { data: users = [] } = useQuery({ queryKey: ["admin", "users"], queryFn: () => apiFetch("/admin/users") });
  const { data: currencies = [] } = useQuery({ queryKey: ["admin", "currencies"], queryFn: () => apiFetch("/admin/currencies") });
  const { data: locations = [] } = useQuery({ queryKey: ["admin", "locations"], queryFn: () => apiFetch("/admin/locations") });
  const { data: overheadRules = DEFAULT_OVERHEAD_RULES } = useQuery({ queryKey: ["admin", "overhead-rules"], queryFn: () => apiFetch("/admin/overhead-rules") });
  const record = resources.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState("Resource Profile");
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", contactEmail: "", contactNumber: "",
    primarySkill: "SAP FICO", subModule: "", primarySubModules: [], secondarySkills: [],
    location: "", locationType: "Offshore",
    employmentType: "Full-Time", employmentStatus: "ACTIVE", deliveryStatus: "AVAILABLE", deployedPercent: 0,
    joiningDate: "", noticePeriod: "30 days", deliveryRollOffDate: "", availabilityDate: "",
    visaWorkAuthorization: "NA (Offshore)", backgroundCheck: "Not Required",
    notAvailableFrom: "", notAvailableTo: "", notAvailableReason: "",
    compensationInputType: "Annual CTC", compensationValue: 0, compensationCurrency: "INR",
    paymentTerms: "Monthly Payroll", paymentCurrency: "INR",
    costRate: 0, reportingManager: "", costCalculationMode: "Offshore Employee", fxRateUsed: 88
  });

  useEffect(() => {
    if (record) {
      setForm({
        firstName: record.firstName || "",
        lastName: record.lastName || "",
        contactEmail: record.contactEmail || "",
        contactNumber: record.contactNumber || "",
        primarySkill: record.primarySkill || "SAP FICO",
        subModule: record.subModule || "",
        primarySubModules: record.primarySubModules?.length ? record.primarySubModules : (record.subModule ? [record.subModule] : []),
        secondarySkills: record.secondarySkills || [],
        location: record.location || "",
        locationType: record.locationType || "Offshore",
        employmentType: record.employmentType || "Full-Time",
        employmentStatus: record.employmentStatus || "ACTIVE",
        deliveryStatus: record.deliveryStatus || "AVAILABLE",
        deployedPercent: record.deployedPercent ?? 0,
        joiningDate: record.joiningDate || "",
        noticePeriod: record.noticePeriod || "30 days",
        deliveryRollOffDate: record.deliveryRollOffDate || "",
        availabilityDate: record.availabilityDate || "",
        visaWorkAuthorization: record.visaWorkAuthorization || "NA (Offshore)",
        backgroundCheck: record.backgroundCheck || "Not Required",
        notAvailableFrom: record.notAvailableFrom || "",
        notAvailableTo: record.notAvailableTo || "",
        notAvailableReason: record.notAvailableReason || "",
        compensationInputType: record.compensationInputType || "Annual CTC",
        compensationValue: record.compensationValue ?? 0,
        compensationCurrency: record.compensationCurrency || "INR",
        paymentTerms: record.paymentTerms || "Monthly Payroll",
        paymentCurrency: record.paymentCurrency || "INR",
        costRate: record.costRate ?? 0,
        reportingManager: record.reportingManager || "",
        costCalculationMode: record.costCalculationMode || "Offshore Employee",
        fxRateUsed: record.fxRateUsed ?? 88
      });
    }
  }, [record]);

  const skillOptions = activeSkills(skills);
  const selectedSkill = skillOptions.find((skill) => skill.name === form.primarySkill);
  const locationOptions = locations.filter((location) => location.active !== false);
  const currencyOptions = currencies.filter((currency) => currency.active !== false);
  const selectedLocation = locationOptions.find((location) => location.name === form.location);
  const reportingManagers = [...usersByRole(users, "Delivery Manager"), ...usersByRole(users, "Director"), ...usersByRole(users, "Vice President"), ...usersByRole(users, "COO")];
  const currentAllocationPercent = Number(record?.currentDeployedPercent ?? form.deployedPercent ?? 0);
  const availablePercent = Math.max(0, Number(record?.currentAvailablePercent ?? (100 - currentAllocationPercent)));
  const visaOptions = form.locationType === "Offshore"
    ? ["NA (Offshore)"]
    : ["H1B", "OPT", "Green Card", "US Citizen", "L1", "Other"];
  const compensationTypeOptions = ["", ...allowedCompensationTypes(form.locationType, form.employmentType)];
  const configuredOverheadRule = findOverheadRule(overheadRules, form.employmentType, form.locationType);
  const configuredOverheadLabel = overheadRuleLabel(configuredOverheadRule, form.employmentType, form.locationType);
  const costFormulaHint =
    form.costCalculationMode === "Offshore Employee"
      ? "(CTC / FX / hours) + configured overhead"
      : form.costCalculationMode === "Onsite Employee"
        ? "(Salary / hours) + configured overhead"
        : form.costCalculationMode === "Manual estimated cost rate"
          ? "Direct hourly cost rate"
          : "Rate converted to USD if needed";

  useEffect(() => {
    const next = { ...form };
    const allowedTypes = allowedCompensationTypes(form.locationType, form.employmentType);
    if (next.compensationInputType && !allowedTypes.includes(next.compensationInputType)) {
      next.compensationInputType = "";
    }

    if (next.locationType === "Offshore") {
      next.fxRateUsed = next.compensationCurrency === "USD" ? 1 : 88;
      next.visaWorkAuthorization = "NA (Offshore)";
    } else {
      next.fxRateUsed = next.compensationCurrency === "INR" ? 88 : 1;
      if (next.visaWorkAuthorization === "NA (Offshore)") {
        next.visaWorkAuthorization = "H1B";
      }
    }

    if (!next.compensationInputType) {
      next.costCalculationMode = "Manual estimated cost rate";
    } else if (next.compensationInputType === "Annual CTC") {
      next.compensationCurrency = next.compensationCurrency || selectedLocation?.defaultCompensationCurrency || "INR";
      next.paymentCurrency = next.paymentCurrency || selectedLocation?.defaultPaymentCurrency || next.compensationCurrency;
      next.costCalculationMode = "Offshore Employee";
    } else if (next.compensationInputType === "Annual Salary") {
      next.compensationCurrency = next.compensationCurrency || selectedLocation?.defaultCompensationCurrency || "USD";
      next.paymentCurrency = next.paymentCurrency || selectedLocation?.defaultPaymentCurrency || next.compensationCurrency;
      next.costCalculationMode = "Onsite Employee";
    } else if (next.compensationInputType === "Monthly Rate") {
      next.compensationCurrency = next.compensationCurrency || selectedLocation?.defaultCompensationCurrency || (next.locationType === "Offshore" ? "INR" : "USD");
      next.paymentCurrency = next.paymentCurrency || selectedLocation?.defaultPaymentCurrency || next.compensationCurrency;
      next.costCalculationMode = "Contractor / C2C";
    } else {
      next.compensationCurrency = next.compensationCurrency || selectedLocation?.defaultCompensationCurrency || (next.locationType === "Offshore" ? "INR" : "USD");
      next.paymentCurrency = next.paymentCurrency || selectedLocation?.defaultPaymentCurrency || next.compensationCurrency;
      next.costCalculationMode = "Contractor / C2C";
    }

    const compensation = Number(next.compensationValue || 0);
    const fx = Number(next.fxRateUsed || 1);
    const hours = 1800;
    if (!next.compensationInputType) {
      next.costRate = compensation ? Number(compensation.toFixed(2)) : Number(next.costRate || 0);
    } else if (next.costCalculationMode === "Offshore Employee") {
      const baseRate = compensation ? Number(((compensation / fx) / hours).toFixed(2)) : 0;
      next.costRate = applyOverheadToBaseCost(baseRate, overheadRules, next.employmentType, next.locationType);
    } else if (next.costCalculationMode === "Onsite Employee") {
      const baseRate = compensation ? Number((compensation / hours).toFixed(2)) : 0;
      next.costRate = applyOverheadToBaseCost(baseRate, overheadRules, next.employmentType, next.locationType);
    } else if (next.compensationInputType === "Monthly Rate") {
      const annualized = compensation * 12;
      const baseRate = annualized ? Number(((annualized / fx) / hours).toFixed(2)) : 0;
      next.costRate = applyOverheadToBaseCost(baseRate, overheadRules, next.employmentType, next.locationType);
    } else {
      const baseRate = compensation ? Number((next.compensationCurrency === "INR" ? compensation / fx : compensation).toFixed(2)) : 0;
      next.costRate = applyOverheadToBaseCost(baseRate, overheadRules, next.employmentType, next.locationType);
    }

    if (JSON.stringify(next) !== JSON.stringify(form)) {
      setForm(next);
    }
  }, [form.locationType, form.employmentType, form.compensationInputType, form.compensationValue, form.compensationCurrency, form.paymentCurrency, overheadRules]);

  function updateLocation(locationName) {
    const location = locationOptions.find((item) => item.name === locationName);
    setForm({
      ...form,
      location: locationName,
      locationType: location?.locationType || form.locationType,
      compensationCurrency: location?.defaultCompensationCurrency || form.compensationCurrency,
      paymentCurrency: location?.defaultPaymentCurrency || form.paymentCurrency
    });
  }

  function updateLocationType(locationType) {
    const location = defaultLocationForType(locationOptions, locationType);
    setForm({
      ...form,
      locationType,
      location: location?.name || form.location,
      compensationCurrency: location?.defaultCompensationCurrency || form.compensationCurrency,
      paymentCurrency: location?.defaultPaymentCurrency || form.paymentCurrency
    });
  }

  function selectedValues(event) {
    return Array.from(event.target.selectedOptions).map((option) => option.value);
  }

  function updateSecondary(index, key, value) {
    const next = [...form.secondarySkills];
    next[index] = { ...next[index], [key]: value, ...(key === "skill" ? { subModule: "" } : {}) };
    setForm({ ...form, secondarySkills: next });
  }

  function addSecondarySkill() {
    setForm({
      ...form,
      secondarySkills: [...form.secondarySkills, { skill: "", subModule: "" }]
    });
  }

  function removeSecondarySkill(index) {
    setForm({
      ...form,
      secondarySkills: form.secondarySkills.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaveError("");
    const payload = {
      ...form,
      subModule: form.primarySubModules?.[0] || "",
      secondarySkills: (form.secondarySkills || []).filter((item) => item.skill)
    };
    try {
      if (isEdit) await patchJson(`/resources/${id}`, payload);
      else await postJson("/resources", payload);
      navigate("/resources");
    } catch (error) {
      setSaveError(error.message || "Unable to save resource.");
    }
  }

  return (
    <PageShell eyebrow="Resource Master" title={isEdit ? `Edit Resource ${record?.number || ""}` : "Create Resource"} subtitle="Maintain the resource profile, skills, planning availability, and authorized costing inputs.">
      <form onSubmit={save}>
        {saveError ? <div className="error-banner">{saveError}</div> : null}
        <div className="tabs" role="tablist">
          {["Resource Profile", "Resource Planning and Costing"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Resource Profile" ? (
          <Section title="Resource Profile">
            <div className="form-grid two-up">
              <Field label="First Name"><input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /></Field>
              <Field label="Last Name"><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /></Field>
              <Field label="Contact Email"><input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></Field>
              <Field label="Contact Number"><input value={form.contactNumber} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} /></Field>
              <Field label="Location">
                <select value={form.location} onChange={(event) => updateLocation(event.target.value)}>
                  <option value="">Select</option>
                  {locationOptions.map((location) => <option key={location.id} value={location.name}>{location.name}</option>)}
                </select>
              </Field>
              <Field label="Location Type"><select value={form.locationType} onChange={(event) => updateLocationType(event.target.value)}><option>Offshore</option><option>Onsite</option><option>Nearshore</option></select></Field>
              <Field label="Engagement Type"><select value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })}><option>Full-Time</option><option>Part-Time</option><option>Contractor</option><option>C2C</option></select></Field>
              <Field label="Engagement Status"><select value={form.employmentStatus} onChange={(event) => setForm({ ...form, employmentStatus: event.target.value })}><option value="ACTIVE">Active</option><option value="ON_LEAVE">Unavailable</option><option value="SABBATICAL">Extended Unavailable</option><option value="INACTIVE">Inactive</option><option value="TERMINATED">Inactive - Closed</option><option value="EXITED">Inactive - Ended</option></select></Field>
              <Field label="Primary SAP Module"><select value={form.primarySkill} onChange={(event) => setForm({ ...form, primarySkill: event.target.value, subModule: "", primarySubModules: [] })}>{skillOptions.map((skill) => <option key={skill.id}>{skill.name}</option>)}</select></Field>
              <Field label="Primary Sub-Modules">
                <select multiple value={form.primarySubModules || []} onChange={(event) => setForm({ ...form, primarySubModules: selectedValues(event), subModule: selectedValues(event)[0] || "" })}>
                  {activeSubModules(selectedSkill).map((item) => {
                    const value = subModuleName(item);
                    return <option key={value} value={value}>{value}</option>;
                  })}
                </select>
              </Field>
              <Field label="Reporting Manager">
                <select value={form.reportingManager} onChange={(event) => setForm({ ...form, reportingManager: event.target.value })}>
                  <option value="">Select</option>
                  {reportingManagers.map((manager) => <option key={manager.id} value={manager.name}>{manager.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="section-header resource-secondary-header">
              <h3>Secondary Skills</h3>
              <button type="button" className="secondary-button" onClick={addSecondarySkill}>+ Add Skill</button>
            </div>
            {form.secondarySkills.length === 0 ? <p className="muted">No secondary skills added yet.</p> : null}
            {form.secondarySkills.map((item, index) => {
              const skill = skills.find((entry) => entry.name === item.skill);
              return (
                <div key={`${item.skill}-${index}`} className="secondary-skill-row">
                  <div className="form-grid two-up">
                    <Field label={`Secondary Skill ${index + 1}`}>
                      <select value={item.skill} onChange={(event) => updateSecondary(index, "skill", event.target.value)}>
                        <option value="">Select</option>
                        {skillOptions.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}
                      </select>
                    </Field>
                    {item.skill ? (
                      <Field label="Secondary Sub-Module">
                        <select value={item.subModule || ""} onChange={(event) => updateSecondary(index, "subModule", event.target.value)}>
                          <option value="">Select</option>
                          {activeSubModules(skill).map((subModule) => {
                            const value = subModuleName(subModule);
                            return <option key={value} value={value}>{value}</option>;
                          })}
                        </select>
                      </Field>
                    ) : <div></div>}
                  </div>
                  <div className="secondary-actions">
                    <button type="button" className="secondary-button" onClick={() => removeSecondarySkill(index)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </Section>
        ) : null}

        {activeTab === "Resource Planning and Costing" ? (
          <Section title="Resource Planning and Costing">
            <Section title="Planning and Costing">
              <div className="form-grid two-up">
                <Field label="Availability Date"><input type="date" value={form.availabilityDate} onChange={(event) => setForm({ ...form, availabilityDate: event.target.value })} /></Field>
                <Field label="Current Engagement Roll-Off Date"><input type="date" value={form.deliveryRollOffDate} onChange={(event) => setForm({ ...form, deliveryRollOffDate: event.target.value })} /></Field>
                <Field label="Current Allocation %"><input value={`${currentAllocationPercent}%`} readOnly /></Field>
                <Field label="Remaining Capacity %"><input value={`${availablePercent}%`} readOnly /></Field>
                {canEditCost ? (
                  <Field label="Costing Type">
                    <select value={form.compensationInputType} onChange={(event) => setForm({ ...form, compensationInputType: event.target.value })}>
                      {compensationTypeOptions.map((option) => <option key={option || "direct"} value={option}>{option || "Direct estimated cost rate"}</option>)}
                    </select>
                  </Field>
                ) : null}
                {canEditCost ? <Field label="Cost Basis Amount"><input type="number" step="any" value={form.compensationValue} onChange={(event) => setForm({ ...form, compensationValue: event.target.value })} /></Field> : null}
                {canEditCost ? (
                  <Field label="Cost Currency">
                    <select value={form.compensationCurrency} onChange={(event) => setForm({ ...form, compensationCurrency: event.target.value })}>
                      <option value="">Select</option>
                      {currencyOptions.map((currency) => <option key={currency.id} value={currency.code}>{currency.code}</option>)}
                    </select>
                  </Field>
                ) : null}
                {canEditCost ? (
                  <Field label="Estimated Cost Rate">
                    <input type="number" step="any" value={form.costRate} readOnly={Boolean(form.compensationInputType)} onChange={(event) => setForm({ ...form, costRate: event.target.value, compensationValue: event.target.value })} />
                  </Field>
                ) : canViewCost ? (
                  <Field label="Estimated Cost Rate"><input value={`$${form.costRate}/hr`} readOnly /></Field>
                ) : null}
                <div className="availability-exception-block">
                  <div>
                    <h3>Availability Exception</h3>
                    <p className="muted small">Optional planning hold for a date range.</p>
                  </div>
                  <div className="form-grid two-up">
                    <Field label="From"><input type="date" value={form.notAvailableFrom} onChange={(event) => setForm({ ...form, notAvailableFrom: event.target.value })} /></Field>
                    <Field label="To"><input type="date" value={form.notAvailableTo} onChange={(event) => setForm({ ...form, notAvailableTo: event.target.value })} /></Field>
                    <Field label="Type">
                      <select value={form.notAvailableReason} onChange={(event) => setForm({ ...form, notAvailableReason: event.target.value })}>
                        <option value="">None</option>
                        <option>Planned Leave</option>
                        <option>Internal Hold</option>
                        <option>Client Hold</option>
                        <option>Training</option>
                        <option>Administrative</option>
                        <option>Other</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            {canViewCost ? (
              <Section title="Costing Calculation Reference">
                <div className="info-grid">
                  <div><span>Delivery Status</span><strong>{form.deliveryStatus.replaceAll("_", " ")}</strong></div>
                  <div><span>Current Allocation %</span><strong>{currentAllocationPercent}%</strong></div>
                  <div><span>Remaining Capacity %</span><strong>{availablePercent}%</strong></div>
                  <div><span>Cost Calculation Mode</span><strong>{form.costCalculationMode}</strong></div>
                  <div><span>Estimated Cost Rate</span><strong>${form.costRate}/hr</strong></div>
                  <div><span>FX Rate Used</span><strong>{form.fxRateUsed} {form.compensationCurrency}/USD</strong></div>
                  <div><span>Standard Hours Per Year</span><strong>1800</strong></div>
                  <div><span>Configured Overhead Rule</span><strong>{configuredOverheadLabel}</strong></div>
                  <div><span>Cost Formula Hint</span><strong>{costFormulaHint}</strong></div>
                </div>
              </Section>
            ) : null}
          </Section>
        ) : null}
        <SaveBar backTo="/resources" label="Save Resource" />
      </form>
    </PageShell>
  );
}

export function OpportunityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { data: opportunities = [] } = useQuery({ queryKey: ["opportunities"], queryFn: () => apiFetch("/opportunities") });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => apiFetch("/accounts") });
  const { data: users = [] } = useQuery({ queryKey: ["admin", "users"], queryFn: () => apiFetch("/admin/users") });
  const record = opportunities.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState("Engagement");
  const [form, setForm] = useState({
    accountId: "", name: "", stage: "QUALIFYING", probability: 20, estimatedRevenue: 0, currency: "USD",
    expectedCloseDate: "2026-05-31", expectedStartDate: "2026-06-01", expectedEndDate: "",
    accountManagerName: "", deliveryManagerName: "", dealType: "Expansion", source: "Existing Client", targetMargin: 35,
    notes: "", notesHistory: [], pendingNote: ""
  });
  const stageDefaults = { QUALIFYING: 20, PROPOSED: 40, NEGOTIATING: 70, SOW: 90, WON: 100, LOST: 0 };

  useEffect(() => {
    setForm((current) => ({ ...current, accountId: accounts[0]?.id || current.accountId }));
  }, [accounts]);

  useEffect(() => {
    const accountManagers = usersByRole(users, "Account Manager");
    const deliveryManagers = usersByDeliveryRole(users, "DM", "Delivery Manager");
    if (!record && users.length) {
      setForm((current) => ({
        ...current,
        accountManagerName: current.accountManagerName || accountManagers[0]?.name || "",
        deliveryManagerName: current.deliveryManagerName || deliveryManagers[0]?.name || ""
      }));
    }
  }, [users, record]);

  useEffect(() => {
    if (record) {
      setForm({
        accountId: record.accountId || "",
        name: record.name || "",
        stage: record.stage || "QUALIFYING",
        probability: record.probability ?? 20,
        estimatedRevenue: record.estimatedRevenue ?? 0,
        currency: record.currency || "USD",
        expectedCloseDate: record.expectedCloseDate?.slice(0, 10) || "2026-05-31",
        expectedStartDate: record.expectedStartDate?.slice(0, 10) || "2026-06-01",
        expectedEndDate: record.expectedEndDate?.slice(0, 10) || "",
        accountManagerName: record.accountManagerName || "",
        deliveryManagerName: record.deliveryManagerName || "",
        dealType: record.dealType || "Expansion",
        source: record.source || "Existing Client",
        targetMargin: record.targetMargin ?? 0,
        notes: record.notes || "",
        notesHistory: record.notesHistory || [],
        pendingNote: ""
      });
    }
  }, [record]);

  function updateStage(stage) {
    setForm({ ...form, stage, probability: stageDefaults[stage] });
  }

  async function save(event) {
    event.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem("dcc-user") || "{}");
    const payload = { ...form };
    if (payload.pendingNote?.trim()) {
      payload.notesHistory = [
        ...(payload.notesHistory || []),
        {
          id: crypto.randomUUID(),
          author: currentUser.name || "System User",
          timestamp: new Date().toISOString(),
          note: payload.pendingNote.trim()
        }
      ];
    }
    delete payload.pendingNote;
    if (isEdit) await patchJson(`/opportunities/${id}`, payload);
    else await postJson("/opportunities", payload);
    navigate("/opportunities");
  }

  return (
    <PageShell eyebrow="Pipeline" title={isEdit ? `Edit Opportunity ${record?.number || ""}` : "Create Opportunity"} subtitle="Maintain engagement data, timeline and financials, and dated deal notes in one workspace.">
      <form onSubmit={save}>
        <div className="tabs" role="tablist">
          {["Engagement", "Timeline & Financials", "Roles", "Notes"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Engagement" ? (
          <Section title="Engagement">
            <div className="form-grid two-up">
              <Field label="Client Name"><select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
              <Field label="Project / Opportunity Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
              <Field label="Source of Opportunity"><select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option>Existing Client</option><option>Referral</option><option>RFP</option><option>Cold Outreach</option><option>Partner</option><option>Other</option></select></Field>
              <Field label="Deal Type"><input value={form.dealType} onChange={(event) => setForm({ ...form, dealType: event.target.value })} /></Field>
              <Field label="Stage"><select value={form.stage} onChange={(event) => updateStage(event.target.value)}><option value="QUALIFYING">Qualifying</option><option value="PROPOSED">Proposed</option><option value="NEGOTIATING">Negotiating</option><option value="SOW">SOW</option><option value="WON">Won</option><option value="LOST">Lost</option></select></Field>
              <Field label="Probability"><input type="number" step="any" value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} /></Field>
              <Field label="Account Manager">
                <select value={form.accountManagerName} onChange={(event) => setForm({ ...form, accountManagerName: event.target.value })} required>
                  <option value="">Select</option>
                  {usersByRole(users, "Account Manager").map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Delivery Manager">
                <select value={form.deliveryManagerName} onChange={(event) => setForm({ ...form, deliveryManagerName: event.target.value })} required>
                  <option value="">Select</option>
                  {usersByDeliveryRole(users, "DM", "Delivery Manager").map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>
        ) : null}

        {activeTab === "Timeline & Financials" ? (
          <Section title="Timeline & Financials">
            <div className="form-grid two-up">
              <Field label="Estimated Revenue"><input type="number" step="any" value={form.estimatedRevenue} onChange={(event) => setForm({ ...form, estimatedRevenue: event.target.value })} /></Field>
              <Field label="Target Margin %"><input type="number" step="any" value={form.targetMargin} onChange={(event) => setForm({ ...form, targetMargin: event.target.value })} /></Field>
              <Field label="Currency"><input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></Field>
              <Field label="Expected Close"><input type="date" value={form.expectedCloseDate} onChange={(event) => setForm({ ...form, expectedCloseDate: event.target.value })} /></Field>
              <Field label="Expected Start"><input type="date" value={form.expectedStartDate} onChange={(event) => setForm({ ...form, expectedStartDate: event.target.value })} /></Field>
              <Field label="Expected End"><input type="date" value={form.expectedEndDate} onChange={(event) => setForm({ ...form, expectedEndDate: event.target.value })} /></Field>
            </div>
          </Section>
        ) : null}

        {activeTab === "Roles" ? (
          <Section title="Opportunity Roles" actions={isEdit ? <button type="button" onClick={() => navigate(`/opportunities/${id}/roles/new`)}>Add Role</button> : null}>
            {isEdit ? (
              <DataTable
                columns={[
                  { key: "number", label: "Role Number" },
                  { key: "title", label: "Role Title" },
                  { key: "skill", label: "SAP Module" },
                  { key: "roleLocation", label: "Location" },
                  { key: "billRate", label: "Bill Rate", render: (row) => `$${Number(row.billRate || 0).toLocaleString()}` },
                  { key: "loadedCostGuidance", label: "Loaded Cost", render: (row) => `$${Number(row.loadedCostGuidance || row.costGuidance || 0).toLocaleString()}` },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => <button className="tiny-button" type="button" onClick={() => navigate(`/opportunities/${id}/roles/${row.id}/edit`)}>Edit</button>
                  }
                ]}
                rows={record?.roles || []}
              />
            ) : (
              <div className="empty-state">Save the opportunity first, then add demand roles in the separate Roles tab.</div>
            )}
          </Section>
        ) : null}

        {activeTab === "Notes" ? (
          <Section title="Notes">
            <div className="form-grid">
              <Field label="Engagement Summary Notes">
                <textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </Field>
              <Field label="Add Progress Note">
                <textarea rows="4" value={form.pendingNote} onChange={(event) => setForm({ ...form, pendingNote: event.target.value })} placeholder="Capture the latest deal update, client feedback, or internal decision." />
              </Field>
            </div>
            <div className="timeline-list">
              {(form.notesHistory || []).length ? form.notesHistory.map((item) => (
                <div key={item.id} className="timeline-entry">
                  <strong>{item.author}</strong>
                  <span>{item.timestamp?.slice(0, 16)?.replace("T", " ")}</span>
                  <p>{item.note}</p>
                </div>
              )) : <p className="muted">No dated notes yet.</p>}
            </div>
          </Section>
        ) : null}
        <SaveBar backTo="/opportunities" label="Save Opportunity" />
      </form>
    </PageShell>
  );
}

export function SowFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { data: sows = [] } = useQuery({ queryKey: ["sows"], queryFn: () => apiFetch("/sows") });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => apiFetch("/accounts") });
  const { data: users = [] } = useQuery({ queryKey: ["admin", "users"], queryFn: () => apiFetch("/admin/users") });
  const { data: opportunities = [] } = useQuery({ queryKey: ["opportunities"], queryFn: () => apiFetch("/opportunities") });
  const record = sows.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState("Engagement");
  const [form, setForm] = useState({
    sourceOpportunityId: "",
    accountId: "", name: "", billingModel: "TM_HOURLY", status: "DRAFT", currency: "USD",
    startDate: "2026-05-01", endDate: "2026-08-31", contractValue: 0, visibleRevenue: 0, visibleCost: 0,
    travelExpensesAllowed: false, travelExpensesBillingType: "Not Billable", travelExpensesCapAmount: 0,
    travelExpensesApprovalRequired: false, travelExpensesNotes: "",
    projectManagerName: "", deliveryManagerName: "", accountManagerName: "", projectHealth: "Green", targetMargin: 0
  });
  const wonOpportunities = opportunities.filter((item) => item.stage === "WON");

  useEffect(() => {
    setForm((current) => ({ ...current, accountId: accounts[0]?.id || current.accountId }));
  }, [accounts]);

  useEffect(() => {
    const projectManagers = usersByDeliveryRole(users, "PM", "Project Manager");
    const deliveryManagers = usersByDeliveryRole(users, "DM", "Delivery Manager");
    if (!record && users.length) {
      setForm((current) => ({
        ...current,
        projectManagerName: current.projectManagerName || projectManagers[0]?.name || "",
        deliveryManagerName: current.deliveryManagerName || deliveryManagers[0]?.name || ""
      }));
    }
  }, [users, record]);

  useEffect(() => {
    if (record) {
      setForm({
        sourceOpportunityId: record.sourceOpportunityId || "",
        accountId: record.accountId || "",
        name: record.name || "",
        billingModel: record.billingModel || "TM_HOURLY",
        status: record.status || "DRAFT",
        currency: record.currency || "USD",
        startDate: record.startDate?.slice(0, 10) || "2026-05-01",
        endDate: record.endDate?.slice(0, 10) || "2026-08-31",
        contractValue: record.contractValue ?? 0,
        visibleRevenue: record.visibleRevenue ?? 0,
        visibleCost: record.visibleCost ?? 0,
        travelExpensesAllowed: record.travelExpensesAllowed ?? false,
        travelExpensesBillingType: record.travelExpensesBillingType || "Not Billable",
        travelExpensesCapAmount: record.travelExpensesCapAmount ?? 0,
        travelExpensesApprovalRequired: record.travelExpensesApprovalRequired ?? false,
        travelExpensesNotes: record.travelExpensesNotes || "",
        projectManagerName: record.projectManagerName || "",
        deliveryManagerName: record.deliveryManagerName || "",
        accountManagerName: record.accountManagerName || "",
        projectHealth: record.projectHealth || "Green",
        targetMargin: record.targetMargin ?? 0
      });
    }
  }, [record]);

  useEffect(() => {
    if (isEdit) {
      return;
    }
    const sourceOpportunityId = searchParams.get("sourceOpportunityId");
    if (!sourceOpportunityId) {
      return;
    }
    setForm((current) => ({ ...current, sourceOpportunityId }));
  }, [searchParams, isEdit]);

  useEffect(() => {
    if (isEdit || !form.sourceOpportunityId) {
      return;
    }
    const sourceOpportunity = wonOpportunities.find((item) => item.id === form.sourceOpportunityId);
    if (!sourceOpportunity) {
      return;
    }
    const loadedCost = Number((Number(sourceOpportunity.estimatedRevenue || 0) * (1 - Number(sourceOpportunity.targetMargin || 0) / 100)).toFixed(2));
    setForm((current) => ({
      ...current,
      accountId: sourceOpportunity.accountId || current.accountId,
      name: current.name || `${sourceOpportunity.name} SOW`,
      currency: sourceOpportunity.currency || current.currency,
      startDate: String(sourceOpportunity.expectedStartDate || "").slice(0, 10) || current.startDate,
      endDate: String(sourceOpportunity.expectedEndDate || "").slice(0, 10) || current.endDate,
      contractValue: current.contractValue || sourceOpportunity.estimatedRevenue || 0,
      visibleRevenue: current.visibleRevenue || sourceOpportunity.estimatedRevenue || 0,
      visibleCost: current.visibleCost || loadedCost,
      accountManagerName: current.accountManagerName || sourceOpportunity.accountManagerName || "",
      deliveryManagerName: current.deliveryManagerName || sourceOpportunity.deliveryManagerName || "",
      targetMargin: sourceOpportunity.targetMargin ?? 0
    }));
  }, [form.sourceOpportunityId, wonOpportunities, isEdit]);

  async function save(event) {
    event.preventDefault();
    const payload = {
      ...form,
      createdFrom: form.sourceOpportunityId ? "OPPORTUNITY" : "DIRECT"
    };
    if (isEdit) await patchJson(`/sows/${id}`, payload);
    else await postJson("/sows", payload);
    navigate("/sows");
  }

  return (
    <PageShell eyebrow="SOW" title={isEdit ? `Edit SOW ${record?.number || ""}` : "Create SOW"} subtitle="Maintain SOW header, billing method, ownership, dates, and commercial visibility.">
      <form onSubmit={save}>
        <div className="tabs" role="tablist">
          {["Engagement", "Timeline & Commercials", "Roles"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Engagement" ? (
          <Section title="Engagement">
            <div className="form-grid two-up">
              <Field label="Reference Opportunity ID">
                <select value={form.sourceOpportunityId} onChange={(event) => setForm({ ...form, sourceOpportunityId: event.target.value })}>
                  <option value="">Manual SOW</option>
                  {wonOpportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.number} / {opportunity.name}</option>)}
                </select>
              </Field>
              <Field label="Client Name"><select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
              <Field label="SOW / Engagement Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
              <Field label="Project Manager">
                <select value={form.projectManagerName} onChange={(event) => setForm({ ...form, projectManagerName: event.target.value })} required>
                  <option value="">Select</option>
                  {usersByDeliveryRole(users, "PM", "Project Manager").map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Delivery Manager">
                <select value={form.deliveryManagerName} onChange={(event) => setForm({ ...form, deliveryManagerName: event.target.value })} required>
                  <option value="">Select</option>
                  {usersByDeliveryRole(users, "DM", "Delivery Manager").map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Account Manager">
                <select value={form.accountManagerName} onChange={(event) => setForm({ ...form, accountManagerName: event.target.value })}>
                  <option value="">Select</option>
                  {usersByRole(users, "Account Manager").map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Health"><select value={form.projectHealth} onChange={(event) => setForm({ ...form, projectHealth: event.target.value })}><option>Green</option><option>Amber</option><option>Red</option></select></Field>
            </div>
            {form.sourceOpportunityId ? (
              <p className="muted">Saving this SOW will copy commercials and role demand from the selected won opportunity. You can still change the copied values before save.</p>
            ) : null}
          </Section>
        ) : null}

        {activeTab === "Timeline & Commercials" ? (
          <Section title="Timeline & Commercials">
            <div className="form-grid two-up">
              <Field label="Billing Model"><select value={form.billingModel} onChange={(event) => setForm({ ...form, billingModel: event.target.value })}><option value="TM_HOURLY">T&M Hourly</option><option value="FIXED_MAN_MONTH">Fixed Man-Month</option><option value="FIXED_MILESTONE">Fixed Milestone</option></select></Field>
              <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ON_HOLD">On Hold</option><option value="COMPLETED">Completed</option><option value="TERMINATED">Terminated</option></select></Field>
              <Field label="Currency"><input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></Field>
              <Field label="Start Date"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
              <Field label="End Date"><input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field>
              <Field label="Contract Value"><input type="number" step="any" value={form.contractValue} onChange={(event) => setForm({ ...form, contractValue: event.target.value })} /></Field>
              <Field label="Visible Revenue"><input type="number" step="any" value={form.visibleRevenue} onChange={(event) => setForm({ ...form, visibleRevenue: event.target.value })} /></Field>
              <Field label="Visible Cost"><input type="number" step="any" value={form.visibleCost} onChange={(event) => setForm({ ...form, visibleCost: event.target.value })} /></Field>
              <Field label="Target Margin %"><input type="number" step="any" value={form.targetMargin} onChange={(event) => setForm({ ...form, targetMargin: event.target.value })} /></Field>
              <Field label="T&E Allowed"><select value={String(form.travelExpensesAllowed)} onChange={(event) => setForm({ ...form, travelExpensesAllowed: event.target.value === "true" })}><option value="false">No</option><option value="true">Yes</option></select></Field>
              <Field label="T&E Billing Type"><select value={form.travelExpensesBillingType} onChange={(event) => setForm({ ...form, travelExpensesBillingType: event.target.value })}><option>Included</option><option>Pass-through</option><option>Capped</option><option>Not Billable</option></select></Field>
              <Field label="T&E Cap Amount"><input type="number" step="any" value={form.travelExpensesCapAmount} onChange={(event) => setForm({ ...form, travelExpensesCapAmount: event.target.value })} /></Field>
              <Field label="T&E Approval Required"><select value={String(form.travelExpensesApprovalRequired)} onChange={(event) => setForm({ ...form, travelExpensesApprovalRequired: event.target.value === "true" })}><option value="false">No</option><option value="true">Yes</option></select></Field>
              <Field label="T&E Notes"><textarea rows="2" value={form.travelExpensesNotes} onChange={(event) => setForm({ ...form, travelExpensesNotes: event.target.value })} /></Field>
            </div>
          </Section>
        ) : null}

        {activeTab === "Roles" ? (
          <Section title="SOW Roles" actions={isEdit ? <button type="button" onClick={() => navigate(`/sows/${id}/roles/new`)}>Add Role</button> : null}>
            {isEdit ? (
              <DataTable
                columns={[
                  { key: "number", label: "Role Number" },
                  { key: "title", label: "Role Title" },
                  { key: "skill", label: "SAP Module" },
                  { key: "locationRequirement", label: "Location" },
                  { key: "billRate", label: "Bill Rate", render: (row) => `$${Number(row.billRate || 0).toLocaleString()}` },
                  { key: "loadedCostGuidance", label: "Loaded Cost", render: (row) => `$${Number(row.loadedCostGuidance || 0).toLocaleString()}` },
                  {
                    key: "assignedResources",
                    label: "Resource",
                    render: (row) => row.deployments?.map((deployment) => `${deployment.resource?.firstName || ""} ${deployment.resource?.lastName || ""}`.trim()).filter(Boolean).join(", ") || "-"
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <div className="row-actions">
                        <button className="tiny-button secondary" type="button" onClick={() => navigate(`/sows/${id}/roles/${row.id}/assign`)}>Assign</button>
                        <button className="tiny-button" type="button" onClick={() => navigate(`/sows/${id}/roles/${row.id}/edit`)}>Edit</button>
                      </div>
                    )
                  }
                ]}
                rows={record?.roles || []}
              />
            ) : form.sourceOpportunityId ? (
              <DataTable
                columns={[
                  { key: "number", label: "Opportunity Role" },
                  { key: "title", label: "Role Title" },
                  { key: "skill", label: "SAP Module" },
                  { key: "roleLocation", label: "Location" },
                  { key: "billRate", label: "Bill Rate", render: (row) => `$${Number(row.billRate || 0).toLocaleString()}` }
                ]}
                rows={wonOpportunities.find((item) => item.id === form.sourceOpportunityId)?.roles || []}
              />
            ) : (
              <div className="empty-state">Manual SOWs can add roles after the SOW header is saved.</div>
            )}
          </Section>
        ) : null}
        <SaveBar backTo="/sows" label="Save SOW" />
      </form>
    </PageShell>
  );
}
