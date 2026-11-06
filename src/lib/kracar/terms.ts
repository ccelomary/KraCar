export function contractualVersion(
  terms: Record<string, string>,
  conditions: Record<string, string>,
) {
  return JSON.stringify([
    Object.entries(terms)
      .filter(([key]) => !key.startsWith("_"))
      .sort(([a], [b]) => a.localeCompare(b)),
    Object.entries(conditions).sort(([a], [b]) => a.localeCompare(b)),
  ]);
}
export const platformPolicyVersion = "2026-11-02";
export const contractualFields = [
  ["minimumAge", "Minimum driver age"],
  ["licenceTenure", "Minimum licence tenure"],
  ["documents", "Required documents"],
  ["drivers", "Authorised and additional drivers"],
  ["securityDeposit", "Deposit amount, payment and return"],
  ["insurance", "Insurance, excess and exclusions"],
  ["mileage", "Included mileage and excess cost"],
  ["fuel", "Fuel policy"],
  ["handover", "Pickup and return locations and hours"],
  ["additionalFees", "Delivery, late return and cleaning fees"],
  ["restrictions", "Usage and travel restrictions"],
  ["extension", "Rental extension"],
  ["incident", "Accident, breakdown and damage procedure"],
  ["cancellation", "Cancellation, changes and no-show"],
  ["activityProgramme", "Activity programme, duration and meeting point"],
  ["participants", "Participant capacity and minimum group size"],
  ["inclusions", "Included and excluded services"],
  ["participation", "Age and participation requirements"],
  ["equipment", "Equipment to bring"],
  ["weather", "Weather, postponement and refunds"],
  ["safety", "Safety instructions"],
] as const;
