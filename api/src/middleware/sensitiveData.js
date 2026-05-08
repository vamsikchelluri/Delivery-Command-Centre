const COST_FIELD_PATTERN = /cost|costing|compensation|paymentCurrency|paymentTerms|fxRateUsed/i;
const MARGIN_FIELD_PATTERN = /margin|grossMargin|targetMargin/i;

function shouldRedactKey(key, user) {
  if (!user?.canViewCost && COST_FIELD_PATTERN.test(key)) {
    return true;
  }
  if (!user?.canViewMargin && MARGIN_FIELD_PATTERN.test(key)) {
    return true;
  }
  return false;
}

function objectLooksSensitiveMetric(value, user) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const marker = [
    value.id,
    value.key,
    value.metric,
    value.label,
    value.name,
    value.detailLabel
  ].filter(Boolean).join(" ");

  if (!user?.canViewCost && COST_FIELD_PATTERN.test(marker)) {
    return true;
  }
  if (!user?.canViewMargin && MARGIN_FIELD_PATTERN.test(marker)) {
    return true;
  }
  return false;
}

function redactAuditJson(value, user) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(redactSensitiveData(parsed, user));
  } catch {
    return value;
  }
}

export function redactSensitiveData(value, user) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !objectLooksSensitiveMetric(item, user))
      .map((item) => redactSensitiveData(item, user));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((result, [key, nestedValue]) => {
    if (shouldRedactKey(key, user)) {
      return result;
    }

    if (["oldValue", "newValue"].includes(key)) {
      result[key] = redactAuditJson(nestedValue, user);
      return result;
    }

    result[key] = redactSensitiveData(nestedValue, user);
    return result;
  }, {});
}

export function redactSensitiveFinancials(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(redactSensitiveData(body, req.user));
  next();
}
