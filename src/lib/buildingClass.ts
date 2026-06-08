import type { PropertyType } from "@/hooks/useProjects";

/** NCC building classification codes — mirror BuildingClass.java in the backend. */
export type BuildingClassCode = "CLASS_1" | "CLASS_1A" | "CLASS_1B" | "CLASS_2";

export interface BuildingClassOption {
  code: BuildingClassCode;
  label: string;
  description: string;
}

/** Selectable building classes, with NCC descriptions for the dropdown. */
export const BUILDING_CLASS_OPTIONS: BuildingClassOption[] = [
  {
    code: "CLASS_1",
    label: "Class 1",
    description: "Standalone dwellings — no dwelling sits above or below another.",
  },
  {
    code: "CLASS_1A",
    label: "Class 1a",
    description:
      "Detached houses, or attached dwellings each separated by a fire-resisting wall (townhouses, terraces, row houses).",
  },
  {
    code: "CLASS_1B",
    label: "Class 1b",
    description:
      "Small boarding/guest houses or short-term holiday accommodation, under floor-area and occupant limits.",
  },
  {
    code: "CLASS_2",
    label: "Class 2",
    description:
      "Two or more separate dwellings stacked with shared common areas (apartments, flats).",
  },
];

/**
 * Default building class auto-selected when a property type is chosen. The user
 * can override it. Custom has no obvious class, so the user must pick.
 */
export const DEFAULT_BUILDING_CLASS_BY_TYPE: Record<PropertyType, BuildingClassCode | null> = {
  house: "CLASS_1",
  duplex: "CLASS_1A",
  townhouse: "CLASS_1A",
  apartment: "CLASS_2",
  renovation: "CLASS_1A",
  extension: "CLASS_1A",
  custom: null,
};

export const buildingClassLabel = (code?: string | null): string | null =>
  BUILDING_CLASS_OPTIONS.find((o) => o.code === code)?.label ?? null;
