// Type-specific details stored in an enrolment's JSONB `attributes`.
export const EXTRA_FIELDS = {
  FEEDING_SCHEME: [],
  GLASSES_DRIVE: [{ key: 'prescription', label: 'Prescription / notes', placeholder: 'e.g. +1.50 both eyes' }],
  SCHOOL_SUPPLIES_DRIVE: [{ key: 'grade', label: 'Grade', placeholder: 'e.g. 4' }],
  CLOTHING_DRIVE: [{ key: 'sizes', label: 'Sizes', placeholder: 'e.g. child 6-7, adult M' }],
  OTHER: [],
}
