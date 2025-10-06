// Example component using oRPC hooks
import { useQuery, useMutation } from '../lib/orpc-hooks';

export function CommunitiesExample() {
  // Type-safe query - automatically inferred types!
  const { data, isLoading } = useQuery({
    path: ['communities', 'list'],
    queryKey: ['communities'],
  });

  // Type-safe mutation - input/output types are inferred
  const createCommunity = useMutation({
    path: ['communities', 'create'],
    onSuccess: () => {
      // Refetch communities list after creating
      console.log('Community created!');
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Communities</h2>
      <ul>
        {data?.data.map((community: any) => (
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
