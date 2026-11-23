import serviceNowApiClient from "@/api/axios-clients/service-now-api/service-now-api-client";
import { appConfig } from "@/config/app-config";

const CONTENT_CACHE_LIMIT = 20;
const contentCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

const cacheContent = (sysId: string, content: string): void => {
  contentCache.delete(sysId);
  contentCache.set(sysId, content);

  if (contentCache.size > CONTENT_CACHE_LIMIT) {
    const oldestSysId = contentCache.keys().next().value;
    if (oldestSysId) contentCache.delete(oldestSysId);
  }
};

const getCachedContent = (sysId: string): string | undefined => {
  const content = contentCache.get(sysId);
  if (content === undefined) return undefined;

  contentCache.delete(sysId);
  contentCache.set(sysId, content);
  return content;
};

/**
 * Fetch a KB body only when an article is opened. Results are shared by the
 * Knowledge AI and Knowledge Browser views and retained in an LRU cache for
 * the current frontend session.
 */
const fetchKnowledgeArticleContent = async (sysId: string): Promise<string> => {
  const normalizedSysId = sysId.trim();
  if (!normalizedSysId) {
    throw new Error(
      "Cannot fetch knowledge article content without a ServiceNow sys_id.",
    );
  }

  const cachedContent = getCachedContent(normalizedSysId);
  if (cachedContent !== undefined) return cachedContent;

  const existingRequest = inFlightRequests.get(normalizedSysId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const response = await serviceNowApiClient.get(
      appConfig.serviceNow.api.knowledgeTable,
      {
        params: {
          sysparm_query: `sys_id=${normalizedSysId}`,
          sysparm_fields: "sys_id,text",
          sysparm_display_value: "all",
          sysparm_limit: 1,
        },
      },
    );

    const article = response?.data?.result?.[0];
    if (!article) {
      throw new Error(
        "The requested knowledge article was not found or is not accessible.",
      );
    }

    const textField = article.text;
    const content =
      typeof textField === "string"
        ? textField
        : typeof textField?.value === "string"
          ? textField.value
          : typeof textField?.display_value === "string"
            ? textField.display_value
            : undefined;

    if (content === undefined) {
      throw new Error(
        "ServiceNow returned no text field for the requested knowledge article.",
      );
    }

    cacheContent(normalizedSysId, content);
    return content;
  })().finally(() => {
    inFlightRequests.delete(normalizedSysId);
  });

  inFlightRequests.set(normalizedSysId, request);
  return request;
};

export default fetchKnowledgeArticleContent;
