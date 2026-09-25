export const BD_ADDRESS_DATA = [
  {
    division: "Dhaka",
    districts: [
      { name: "Dhaka", subdivisions: ["Dhanmondi", "Gulshan", "Uttara", "Mirpur", "Mohakhali", "Banani"] },
      { name: "Gazipur", subdivisions: ["Gazipur Sadar", "Kaliakair", "Sreepur", "Kaliganj"] },
      { name: "Narayanganj", subdivisions: ["Narayanganj Sadar", "Rupganj", "Araihazar", "Sonargaon"] },
    ],
  },
  {
    division: "Chittagong",
    districts: [
      { name: "Chittagong", subdivisions: ["Pahartali", "Panchlaish", "Banshkhali", "Anwara"] },
      { name: "Cox's Bazar", subdivisions: ["Cox's Bazar Sadar", "Teknaf", "Ukhia"] },
    ],
  },
  {
    division: "Sylhet",
    districts: [
      { name: "Sylhet", subdivisions: ["Sylhet Sadar", "Beanibazar", "Jaintiapur", "Sreemangal"] },
    ],
  },
  {
    division: "Khulna",
    districts: [
      { name: "Khulna", subdivisions: ["Khulna Sadar", "Batiaghata", "Phultala", "Dumuria"] },
    ],
  },
  {
    division: "Rajshahi",
    districts: [
      { name: "Rajshahi", subdivisions: ["Rajshahi Sadar", "Bagha", "Paba", "Tanore"] },
    ],
  },
  {
    division: "Barisal",
    districts: [
      { name: "Barisal", subdivisions: ["Barisal Sadar", "Bakerganj", "Gournadi", "Muladi"] },
    ],
  },
  {
    division: "Rangpur",
    districts: [
      { name: "Rangpur", subdivisions: ["Rangpur Sadar", "Mithapukur", "Gangachhara", "Badarganj"] },
    ],
  },
  {
    division: "Mymensingh",
    districts: [
      { name: "Mymensingh", subdivisions: ["Mymensingh Sadar", "Muktagachha", "Trishal", "Phulpur"] },
    ],
  },
];

export function parseAddressString(address = "") {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    street: parts[0] || "",
    area: parts[1] || "",
    district: parts[2] || "",
    division: parts[3] || "",
  };
}

export function formatAddressString(addressParts) {
  if (!addressParts) return "";
  return [addressParts.street, addressParts.area, addressParts.district, addressParts.division]
    .filter(Boolean)
    .join(", ");
}

export function getDistrictOptions(division) {
  if (!division) return BD_ADDRESS_DATA.flatMap((item) => item.districts.map((district) => district.name));
  const divisionEntry = BD_ADDRESS_DATA.find((item) => item.division === division);
  return divisionEntry ? divisionEntry.districts.map((district) => district.name) : [];
}

export function getSubdivisionOptions(division, district) {
  if (!division || !district) return [];
  const divisionEntry = BD_ADDRESS_DATA.find((item) => item.division === division);
  if (!divisionEntry) return [];
  const districtEntry = divisionEntry.districts.find((entry) => entry.name === district);
  return districtEntry ? districtEntry.subdivisions : [];
}

export function calculateShippingFee(division = "", district = "", deliveryOption = "default", deliveryAreasJson = "") {
  const defaultFee = 60;
  if (!deliveryAreasJson) return defaultFee;
  
  let zones = {};
  try {
    zones = typeof deliveryAreasJson === "string" ? JSON.parse(deliveryAreasJson) : deliveryAreasJson;
  } catch (error) {
    return defaultFee;
  }

  // Handle hierarchical legacy zones structure (divisions → districts)
  if (zones.divisions && Array.isArray(zones.divisions)) {
    const divisionEntry = zones.divisions.find(d => d.name === division || d.id === division);
    if (divisionEntry) {
      const districtEntry = divisionEntry.districts?.find(d => d.name === district || d.id === district);
      if (districtEntry) {
        const feeValue = deliveryOption === "fast" ? districtEntry.fast_delivery_fee : districtEntry.delivery_fee;
        const parsed = Number(feeValue);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
    }
  }

  // Fallback: Handle legacy flat array structure for backwards compatibility
  if (Array.isArray(zones)) {
    const normalizedDistrict = district.trim().toLowerCase();
    const match = zones.find((area) => area.area?.trim().toLowerCase() === normalizedDistrict);
    const feeValue = match ? (deliveryOption === "fast" ? match.fast_fee : match.default_fee) : null;
    const parsed = Number(feeValue);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  return defaultFee;
}

export function calculateHierarchicalShippingFee(division = "", district = "", area = "", deliveryOption = "default", hierarchicalZonesJson = "") {
  const defaultFee = 60;
  if (!hierarchicalZonesJson) return { fee: defaultFee, found: false };
  
  let zones = {};
  try {
    zones = typeof hierarchicalZonesJson === "string" ? JSON.parse(hierarchicalZonesJson) : hierarchicalZonesJson;
  } catch (error) {
    return { fee: defaultFee, found: false };
  }
  
  if (!zones.divisions || !Array.isArray(zones.divisions)) return { fee: defaultFee, found: false };
  
  const divisionEntry = zones.divisions.find(d => d.name === division || d.id === division);
  if (!divisionEntry) return { fee: defaultFee, found: false };
  
  const districtEntry = divisionEntry.districts?.find(d => d.name === district || d.id === district);
  if (!districtEntry) return { fee: defaultFee, found: false };
  
  // Try to find exact area match
  let areaEntry = districtEntry.areas?.find(a => a.name === area);
  
  // If no exact match and area not empty, fall back to "Unknown" area
  if (!areaEntry && area && districtEntry.areas) {
    areaEntry = districtEntry.areas.find(a => a.name === "Unknown");
  }
  
  // If still no area entry, use district fee as fallback (for old data format)
  if (!areaEntry) {
    const feeValue = deliveryOption === "fast" ? districtEntry.fast_delivery_fee : districtEntry.delivery_fee;
    const parsed = Number(feeValue);
    if (Number.isFinite(parsed) && parsed >= 0) return { fee: parsed, found: true };
  }
  
  // Use area fee
  if (areaEntry) {
    const feeValue = deliveryOption === "fast" ? areaEntry.fast_delivery_fee : areaEntry.delivery_fee;
    const parsed = Number(feeValue);
    if (Number.isFinite(parsed) && parsed >= 0) return { fee: parsed, found: true };
  }
  
  return { fee: defaultFee, found: false };
}
