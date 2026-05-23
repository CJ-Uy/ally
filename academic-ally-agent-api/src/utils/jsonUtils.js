export const safeJsonParse = (value) => {
  if (typeof value !== "string") {
    return { ok: true, value };
  }

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error };
  }
};

export const extractJsonFromText = (text) => {
  if (typeof text !== "string" || text.trim() === "") {
    return null;
  }

  const trimmed = text.trim();
  const direct = safeJsonParse(trimmed);
  if (direct.ok) {
    return direct.value;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    const fenced = safeJsonParse(fencedMatch[1].trim());
    if (fenced.ok) {
      return fenced.value;
    }
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    const objectParse = safeJsonParse(trimmed.slice(firstObject, lastObject + 1));
    if (objectParse.ok) {
      return objectParse.value;
    }
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    const arrayParse = safeJsonParse(trimmed.slice(firstArray, lastArray + 1));
    if (arrayParse.ok) {
      return arrayParse.value;
    }
  }

  return null;
};

export const getGeminiText = (response) => {
  if (!response) {
    return "";
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  if (typeof response.text === "function") {
    return response.text();
  }

  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || ""
  );
};
