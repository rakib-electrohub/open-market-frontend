import { useMemo, useState, useEffect } from "react";
import { BD_ADDRESS_DATA, getDistrictOptions, getSubdivisionOptions } from "@/lib/addressUtils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AddressSelector({ value = {}, onChange, disabled = false, addressData = BD_ADDRESS_DATA }) {
  const { division = "", district = "", area = "", street = "" } = value;
  const [divisionSearch, setDivisionSearch] = useState(division);
  const [districtSearch, setDistrictSearch] = useState(district);
  const [areaSearch, setAreaSearch] = useState(area);

  useEffect(() => {
    setDivisionSearch(division);
    setDistrictSearch(district);
    setAreaSearch(area);
  }, [division, district, area]);

  const divisionOptions = useMemo(
    () => addressData.map((item) => item.division),
    [addressData]
  );
  const districtOptions = useMemo(
    () => {
      if (addressData === BD_ADDRESS_DATA) return getDistrictOptions(divisionSearch);
      if (!divisionSearch) return addressData.flatMap((item) => item.districts.map((itemDistrict) => itemDistrict.name));

      const divisionEntry = addressData.find((item) => item.division === divisionSearch);
      return divisionEntry ? divisionEntry.districts.map((itemDistrict) => itemDistrict.name) : [];
    },
    [addressData, divisionSearch]
  );
  const areaOptions = useMemo(
    () => {
      if (addressData === BD_ADDRESS_DATA) return getSubdivisionOptions(divisionSearch, districtSearch);
      if (!divisionSearch || !districtSearch) return [];

      const divisionEntry = addressData.find((item) => item.division === divisionSearch);
      const districtEntry = divisionEntry?.districts.find((entry) => entry.name === districtSearch);
      return districtEntry ? districtEntry.subdivisions : [];
    },
    [addressData, divisionSearch, districtSearch]
  );

  const updateFields = (patch) => {
    onChange?.({ ...value, ...patch });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label className="text-xs text-muted-foreground">Region</Label>
        <Input
          list="division-options"
          value={divisionSearch}
          onChange={(e) => {
            const nextValue = e.target.value;
            setDivisionSearch(nextValue);
            setDistrictSearch("");
            setAreaSearch("");
            updateFields({ division: nextValue, district: "", area: "" });
          }}
          placeholder="Select division"
          className="mt-1"
          disabled={disabled}
        />
        <datalist id="division-options">
          {divisionOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">District</Label>
        <Input
          list="district-options"
          value={districtSearch}
          onChange={(e) => {
            const nextValue = e.target.value;
            setDistrictSearch(nextValue);
            setAreaSearch("");
            updateFields({ district: nextValue, area: "" });
          }}
          placeholder="Select district"
          className="mt-1"
          disabled={disabled}
        />
        <datalist id="district-options">
          {districtOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">City / Upazila or Area</Label>
        <Input
          list="area-options"
          value={areaSearch}
          onChange={(e) => {
            const nextValue = e.target.value;
            setAreaSearch(nextValue);
            updateFields({ area: nextValue });
          }}
          placeholder="Select or type city/upazila or area"
          className="mt-1"
          disabled={disabled}
        />
        <datalist id="area-options">
          {areaOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Street / House / Road</Label>
        <Input
          value={street}
          onChange={(e) => updateFields({ street: e.target.value })}
          placeholder="House, road, area, plot"
          className="mt-1"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
