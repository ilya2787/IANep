"use client";
import { useState } from "react";
import { BriefDatePicker } from "@/components/sections/BriefDatePicker";
export function DateField({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <BriefDatePicker value={value} onChange={setValue} name={name} label={label} title={label} hint="" />;
}
