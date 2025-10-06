// Example component using oRPC hooks
import { useQuery, useMutation, apiClient } from '../lib/orpc-hooks';

export function CommunitiesExample() {
  // Type-safe query using apiClient
  const { data, isLoading } = useQuery(
    ['communities'],
    async () => {
      // Call oRPC endpoint through apiClient
      return (apiClient as any).communities.list();
    }
  );

  // Type-safe mutation using apiClient
  const createCommunity = useMutation(
    async (input: { name: string; description?: string }) => {
      return (apiClient as any).communities.create(input);
    },
    {
      onSuccess: () => {
        // Refetch communities list after creating
        console.log('Community created!');
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Communities</h2>
      <ul>
        {data?.data?.map((community: any) => (
          <li key={community.id}>
            {community.name} - {community.stage}
          </li>
        ))}
      </ul>

      <button
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
