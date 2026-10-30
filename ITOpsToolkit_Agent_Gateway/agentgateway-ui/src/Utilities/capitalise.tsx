export const capitalizeFirstLetter = (string: string | any) => {
  if (!string) return "";
  const str = typeof string === "string" ? string : string?.display_value || string?.value || String(string);
  return str?.charAt(0).toUpperCase() + str?.slice(1);
};
