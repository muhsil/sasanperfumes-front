import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { disableRuntimeCache, cmsUrl } from "@/config/site";

const WORDPRESS_GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_WORDPRESS_GRAPHQL_URL ||
  `${cmsUrl}/graphql`;

const httpLink = createHttpLink({
  uri: WORDPRESS_GRAPHQL_ENDPOINT,
});

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          products: {
            keyArgs: ["where"],
            merge(existing, incoming, { args }) {
              if (!args?.after) {
                return incoming;
              }
              return {
                ...incoming,
                nodes: [...(existing?.nodes || []), ...incoming.nodes],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
    query: {
      fetchPolicy: "cache-first",
    },
  },
});

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: {
    currency?: string;
    locale?: string;
  }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.currency) {
    headers["X-WC-Currency"] = options.currency;
  }

  if (options?.locale) {
    headers["X-WP-Locale"] = options.locale === "ar" ? "ar" : "en_US";
  }

  const response = await fetch(WORDPRESS_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
    ...(disableRuntimeCache ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
  });

  const json = await response.json();

  if (json.errors) {
    console.error("GraphQL Errors:", json.errors);
    throw new Error(json.errors[0]?.message || "GraphQL Error");
  }

  return json.data;
}
