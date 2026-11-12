export function createUserPayload(
  values: Record<string, string>,
  extras: Record<string, unknown> = {},
) {
  const payload: Record<string, unknown> = {
    ...extras,
    email: values.email.trim(),
    password: values.password,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
  };
  if (values.middleName?.trim()) payload.middleName = values.middleName.trim();
  if (values.role) payload.role = values.role;
  return payload;
}

