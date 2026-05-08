const EMPLOYMENT_STATUS_LABELS = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  SABBATICAL: "Sabbatical",
  INACTIVE: "Inactive",
  TERMINATED: "Terminated",
  EXITED: "Exited"
};

const CURRENT_DELIVERY_STATUS_LABELS = {
  AVAILABLE: "Available",
  PARTIALLY_DEPLOYED: "Partially Deployed",
  FULLY_DEPLOYED: "Fully Deployed",
  ON_LEAVE: "On Leave",
  SABBATICAL: "Sabbatical",
  INACTIVE: "Inactive",
  TERMINATED: "Terminated",
  EXITED: "Exited"
};

const EMPLOYMENT_OVERRIDES = new Set(["ON_LEAVE", "SABBATICAL", "INACTIVE", "TERMINATED", "EXITED"]);

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function deploymentCurrentState(deployment, todayKey = localDateKey()) {
  const start = formatDateKey(deployment.startDate);
  const end = formatDateKey(deployment.endDate);
  if (start && start > todayKey) {
    return "Future";
  }
  if (end && end < todayKey) {
    return "Ended";
  }
  return "Current";
}

export function deliveryStatusFromAllocation(allocation) {
  const deployed = Number(allocation || 0);
  if (deployed >= 100) {
    return "FULLY_DEPLOYED";
  }
  if (deployed > 0) {
    return "PARTIALLY_DEPLOYED";
  }
  return "AVAILABLE";
}

export function deriveCurrentResourceState(resource, { deployments = [], roles = [], sows = [] } = {}, todayKey = localDateKey()) {
  const resourceDeployments = deployments
    .filter((deployment) => deployment.resourceId === resource.id)
    .map((deployment) => {
      const role = roles.find((item) => item.id === deployment.sowRoleId) || null;
      const sow = sows.find((item) => item.id === role?.sowId) || null;
      return {
        ...deployment,
        role,
        sow,
        currentState: deploymentCurrentState(deployment, todayKey)
      };
    });

  const employmentStatus = resource.employmentStatus || "ACTIVE";
  if (EMPLOYMENT_OVERRIDES.has(employmentStatus)) {
    return {
      ...resource,
      deployments: resourceDeployments,
      employmentStatusLabel: EMPLOYMENT_STATUS_LABELS[employmentStatus] || employmentStatus,
      currentDeliveryStatus: employmentStatus,
      currentDeliveryStatusLabel: CURRENT_DELIVERY_STATUS_LABELS[employmentStatus] || employmentStatus,
      currentDeployedPercent: 0,
      currentAvailablePercent: 0,
      currentActiveSowName: "None"
    };
  }

  const currentDeployments = resourceDeployments.filter((deployment) =>
    deployment.currentState === "Current" && deployment.status !== "CANCELLED"
  );
  const currentDeployedPercent = currentDeployments.reduce(
    (sum, deployment) => sum + Number(deployment.allocationPercent || 0),
    0
  );
  const currentDeliveryStatus = deliveryStatusFromAllocation(currentDeployedPercent);

  return {
    ...resource,
    deployments: resourceDeployments,
    employmentStatusLabel: EMPLOYMENT_STATUS_LABELS[employmentStatus] || employmentStatus,
    currentDeliveryStatus,
    currentDeliveryStatusLabel: CURRENT_DELIVERY_STATUS_LABELS[currentDeliveryStatus] || currentDeliveryStatus,
    currentDeployedPercent,
    currentAvailablePercent: Math.max(0, 100 - currentDeployedPercent),
    currentActiveSowName: currentDeployments.map((deployment) => deployment.sow?.name).find(Boolean) || "None"
  };
}

export function summarizeCurrentResourceStatuses(resources) {
  return resources.reduce((summary, resource) => {
    const status = resource.currentDeliveryStatus || "AVAILABLE";
    if (status === "FULLY_DEPLOYED") summary.fullyDeployed += 1;
    else if (status === "PARTIALLY_DEPLOYED") summary.partiallyDeployed += 1;
    else if (status === "AVAILABLE") summary.available += 1;
    else if (status === "ON_LEAVE") summary.onLeave += 1;
    else if (status === "SABBATICAL") summary.sabbatical += 1;
    else if (status === "INACTIVE") summary.inactive += 1;
    else if (status === "TERMINATED") summary.terminated += 1;
    else if (status === "EXITED") summary.exited += 1;
    summary.total += 1;
    return summary;
  }, {
    fullyDeployed: 0,
    partiallyDeployed: 0,
    available: 0,
    onLeave: 0,
    sabbatical: 0,
    inactive: 0,
    terminated: 0,
    exited: 0,
    total: 0
  });
}
