export function activeMasterItems(items, category) {
  return (items || [])
    .filter((item) => item.active !== false && item.category === category)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.label || "").localeCompare(String(b.label || "")));
}

export function optionValue(item) {
  return item?.code || item?.label || "";
}

export function optionLabel(item) {
  return item?.label || item?.code || "";
}

export function configValue(configs, key, fallback = "") {
  const record = (configs || []).find((item) => item.key === key);
  return record?.value ?? fallback;
}

export function rateForCurrency(fxRates, currencyCode, effectiveDate = new Date()) {
  const key = String(currencyCode || "USD").toUpperCase();
  const dateKey = new Date(effectiveDate).toISOString().slice(0, 10);
  const match = (fxRates || [])
    .filter((rate) =>
      rate.active !== false &&
      String(rate.currencyCode || "").toUpperCase() === key &&
      String(rate.validFrom || "").slice(0, 10) <= dateKey &&
      (!rate.validTo || String(rate.validTo).slice(0, 10) >= dateKey)
    )
    .sort((a, b) => String(b.validFrom || "").localeCompare(String(a.validFrom || "")))[0];
  return Number(match?.rateToUsd || (key === "USD" ? 1 : 0));
}
