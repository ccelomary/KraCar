export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "The request could not be completed."),
      { status: response.status },
    );
  return data;
}
