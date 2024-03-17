import * as yup from 'yup';
import { emailRegex, telephoneRegex } from '.';
export const AddClinicInputSchema = yup.object().shape({
  id: yup.string().nullable(),
  name: yup.string(),
  email: yup.string().matches(emailRegex).nullable(),
  telephone_number: yup.string().matches(telephoneRegex),
  google_maps_url: yup.string().nullable(),
  address: yup.string(),
});
