import { customModelProvider } from "lib/ai/models";
import { fetchLiteLLMModelList } from "lib/ai/litellm";

export const GET = async () => {
  const modelsInfo = [...customModelProvider.modelsInfo];

  const litellmEntry = modelsInfo.find((p) => p.provider === "litellm");
  if (!litellmEntry || litellmEntry.models.length === 0) {
    const discovered = await fetchLiteLLMModelList();
    if (discovered.length > 0) {
      const idx = modelsInfo.findIndex((p) => p.provider === "litellm");
      const entry = {
        provider: "litellm",
        models: discovered.map((m) => ({
          name: m.name,
          isToolCallUnsupported: false,
          isImageInputUnsupported: true,
          supportedFileMimeTypes: [] as string[],
        })),
        hasAPIKey: true,
      };
      if (idx >= 0) {
        modelsInfo[idx] = entry;
      } else {
        modelsInfo.push(entry);
      }
    }
  }

  return Response.json(
    modelsInfo.sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    }),
  );
};
