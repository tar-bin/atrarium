// Example component using oRPC hooks
import type { CommunityOutput } from '@atrarium/contracts';
import { apiClient, useMutation, useQuery } from '../lib/orpc-hooks';

type CommunityListResponse = {
  data: CommunityOutput[];
};

export function CommunitiesExample() {
  // Type-safe query using apiClient
  const { data, isLoading } = useQuery<CommunityListResponse>(['communities'], async () => {
    // Call oRPC endpoint through apiClient
    // biome-ignore lint/suspicious/noExplicitAny: apiClient type needs proper oRPC integration
    return (apiClient as any).communities.list();
  });

  // Type-safe mutation using apiClient
  const createCommunity = useMutation(
    async (input: { name: string; description?: string }) => {
      // biome-ignore lint/suspicious/noExplicitAny: apiClient type needs proper oRPC integration
      return (apiClient as any).communities.create(input);
    },
    {
      onSuccess: () => {
        // Refetch communities list after creating
        // biome-ignore lint/suspicious/noConsole: Example code for demonstration
        console.log('Community created!');
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Communities</h2>
      <ul>
        {data?.data?.map((community) => (
          <li key={community.id}>
            {community.name} - {community.stage}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          createCommunity.mutate({
            name: 'New Community',
            description: 'A test community',
          });
        }}
      >
        Create Community
      </button>
    </div>
  );
}
