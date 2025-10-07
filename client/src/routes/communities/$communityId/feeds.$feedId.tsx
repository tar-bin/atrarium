import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { FeedDetail } from '@/components/feeds/FeedDetail';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { usePDS } from '@/contexts/PDSContext';
import { isAuthenticated } from '@/lib/auth';
import type { Feed, Post } from '@/types';

export const Route = createFileRoute('/communities/$communityId/feeds/$feedId')({
  beforeLoad: ({ params }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/',
        search: { redirect: `/communities/${params.communityId}/feeds/${params.feedId}` },
      });
    }
  },
  component: FeedDetailPage,
});

function FeedDetailPage() {
  const { communityId, feedId } = Route.useParams();
  const { agent, session } = usePDS();
  const { setContextInfo, clearContextInfo } = useLayoutContext();

  // TODO: Replace with TanStack Query in Phase 3.6
  // Community names mapping
  const communityNames: Record<string, string> = {
    'comm-anime-lovers': 'Anime Lovers',
    'comm-tech-news': 'Tech News',
    'comm-game-dev': 'Game Development',
  };

  // Mock feed and post data based on seeds/dev-data.sql
  const feedData: Record<string, { feed: Feed; posts: Post[] }> = {
    'feed-anime-general': {
      feed: {
        id: 'feed-anime-general',
        communityId: 'comm-anime-lovers',
        name: 'General Anime Talk',
        description: 'General anime discussions and recommendations',
        status: 'active',
        hashtag: '#atr_a1b2c3d4',
        posts7d: 42,
        lastPostAt: null,
        activeUsers7d: 12,
        createdAt: 1704067200,
      },
      posts: [
        {
          id: 1,
          uri: 'at://did:plc:sakura.bsky.social/app.bsky.feed.post/3lbxh7k2wy42c',
          feedId: 'feed-anime-general',
          authorDid: 'did:plc:sakura.bsky.social',
          text: "Just finished Frieren episode 28 and I'm not crying, YOU'RE crying 😭\n\nThe way they handled Himmel's flashback... this show is a masterpiece in storytelling. Every episode makes me appreciate the quiet moments more.\n\n#atr_a1b2c3d4",
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 7200, // 2 hours ago
          indexedAt: Date.now() / 1000 - 7200,
        },
        {
          id: 2,
          uri: 'at://did:plc:yuuto.bsky.social/app.bsky.feed.post/3lbxgm9pqr21k',
          feedId: 'feed-anime-general',
          authorDid: 'did:plc:yuuto.bsky.social',
          text: 'Okay hear me out...\n\nSteins;Gate (2011) is STILL the best time travel anime ever made. The character development, the pacing, the payoff... nothing has come close.\n\nChange my mind. 🧪⏰\n\n#atr_a1b2c3d4',
          hasMedia: false,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 14400, // 4 hours ago
          indexedAt: Date.now() / 1000 - 14400,
        },
        {
          id: 3,
          uri: 'at://did:plc:mika.bsky.social/app.bsky.feed.post/3lbwz3n8tx52p',
          feedId: 'feed-anime-general',
          authorDid: 'did:plc:mika.bsky.social',
          text: 'Weekly roundup! What are you all watching this season? 📺\n\nMe:\n• Frieren (GOAT tier)\n• Apothecary Diaries (so good!!)\n• Dungeon Meshi (finally animated!)\n\nDrop your recs below! ⬇️\n\n#atr_a1b2c3d4',
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 28800, // 8 hours ago
          indexedAt: Date.now() / 1000 - 28800,
        },
        {
          id: 4,
          uri: 'at://did:plc:rei.bsky.social/app.bsky.feed.post/3lbvy8q4nm61s',
          feedId: 'feed-anime-general',
          authorDid: 'did:plc:rei.bsky.social',
          text: 'Hot take: Bocchi the Rock has better cinematography than most "serious" anime.\n\nThe visual storytelling in episode 8... the colors, the transitions, the symbolism. Peak fiction fr fr 🎸✨\n\n#atr_a1b2c3d4',
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 43200, // 12 hours ago
          indexedAt: Date.now() / 1000 - 43200,
        },
        {
          id: 5,
          uri: 'at://did:plc:kenji.bsky.social/app.bsky.feed.post/3lbux2m7kp93w',
          feedId: 'feed-anime-general',
          authorDid: 'did:plc:kenji.bsky.social',
          text: 'Why is nobody talking about Vinland Saga S2??? \n\nThis went from "cool Vikings fighting" to "deep philosophical exploration of violence and redemption" and I\'m HERE FOR IT.\n\nThorfinn\'s character arc is genuinely one of the best in all of anime.\n\n#atr_a1b2c3d4',
          hasMedia: false,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 86400, // 1 day ago
          indexedAt: Date.now() / 1000 - 86400,
        },
      ],
    },
    'feed-tech-ai': {
      feed: {
        id: 'feed-tech-ai',
        communityId: 'comm-tech-news',
        name: 'AI & Machine Learning',
        description: 'Artificial intelligence and ML developments',
        status: 'active',
        hashtag: '#atr_i9j0k1l2',
        posts7d: 95,
        lastPostAt: null,
        activeUsers7d: 28,
        createdAt: 1704067200,
      },
      posts: [
        {
          id: 1,
          uri: 'at://did:plc:alex.bsky.social/app.bsky.feed.post/3lby9x4nqp82m',
          feedId: 'feed-tech-ai',
          authorDid: 'did:plc:alex.bsky.social',
          text: "🚀 Just deployed our first production model using Anthropic's Claude API!\n\nLatency: 1.2s avg\nAccuracy: 94.3%\nCost: 40% less than GPT-4\n\nThe structured outputs feature is a game changer. No more JSON parsing nightmares 🙏\n\n#atr_i9j0k1l2",
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 3600, // 1 hour ago
          indexedAt: Date.now() / 1000 - 3600,
        },
        {
          id: 2,
          uri: 'at://did:plc:sarah.bsky.social/app.bsky.feed.post/3lby8k2mqw71n',
          feedId: 'feed-tech-ai',
          authorDid: 'did:plc:sarah.bsky.social',
          text: 'Hot take: RAG is overrated for most use cases.\n\nJust trained a LoRA adapter on our docs (2000 examples) and it beats our fancy RAG pipeline in:\n- Speed (3x faster)\n- Accuracy (89% vs 84%)\n- Cost (way cheaper)\n\nSometimes simple > complex 🤷‍♀️\n\n#atr_i9j0k1l2',
          hasMedia: false,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 10800, // 3 hours ago
          indexedAt: Date.now() / 1000 - 10800,
        },
        {
          id: 3,
          uri: 'at://did:plc:marcus.bsky.social/app.bsky.feed.post/3lbx7m9prt63k',
          feedId: 'feed-tech-ai',
          authorDid: 'did:plc:marcus.bsky.social',
          text: 'Debugging ML models at 2am be like:\n\n"Why is my loss NaN?"\n*checks data*\nAll good.\n\n*checks model*\nAll good.\n\n*checks learning rate*\n1e10\n\n...\nI need sleep 😴💤\n\n#atr_i9j0k1l2',
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 21600, // 6 hours ago
          indexedAt: Date.now() / 1000 - 21600,
        },
        {
          id: 4,
          uri: 'at://did:plc:priya.bsky.social/app.bsky.feed.post/3lbw3n8kx52p',
          feedId: 'feed-tech-ai',
          authorDid: 'did:plc:priya.bsky.social',
          text: 'Incredible paper just dropped: "Attention Is All You Need... Maybe Not?"\n\nResearchers at Stanford achieved SOTA results on vision tasks using pure MLPs with smart architectural tricks.\n\nThe era of "transformers for everything" might be ending 👀\n\nLink in replies ⬇️\n\n#atr_i9j0k1l2',
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 43200, // 12 hours ago
          indexedAt: Date.now() / 1000 - 43200,
        },
        {
          id: 5,
          uri: 'at://did:plc:chen.bsky.social/app.bsky.feed.post/3lbuz2m7kp93w',
          feedId: 'feed-tech-ai',
          authorDid: 'did:plc:chen.bsky.social',
          text: "PSA: If you're doing image classification in 2025 and NOT using Vision Transformers (ViT), you're leaving performance on the table.\n\nWe migrated from ResNet-50 to ViT-B/16:\n• Accuracy: +7.2%\n• Training time: -40%\n• Model size: -15%\n\nPretrained models FTW! 🎯\n\n#atr_i9j0k1l2",
          hasMedia: false,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 86400, // 1 day ago
          indexedAt: Date.now() / 1000 - 86400,
        },
      ],
    },
    'feed-game-unity': {
      feed: {
        id: 'feed-game-unity',
        communityId: 'comm-game-dev',
        name: 'Unity Tips',
        description: 'Unity engine tips and tricks',
        status: 'active',
        hashtag: '#atr_q7r8s9t0',
        posts7d: 45,
        lastPostAt: null,
        activeUsers7d: 18,
        createdAt: 1704067200,
      },
      posts: [
        {
          id: 1,
          uri: 'at://did:plc:jake.bsky.social/app.bsky.feed.post/3lbz2k7pqm91x',
          feedId: 'feed-game-unity',
          authorDid: 'did:plc:jake.bsky.social',
          text: "🎮 Pro tip for Unity devs:\n\nInstead of Instantiate() spam for projectiles, use Object Pooling!\n\nBefore: 50fps with GC spikes\nAfter: Stable 144fps\n\nCode snippet in replies. You're welcome 😎\n\n#atr_q7r8s9t0",
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 5400, // 1.5 hours ago
          indexedAt: Date.now() / 1000 - 5400,
        },
        {
          id: 2,
          uri: 'at://did:plc:emma.bsky.social/app.bsky.feed.post/3lby1m8nrt42k',
          feedId: 'feed-game-unity',
          authorDid: 'did:plc:emma.bsky.social',
          text: "After 3 weeks of fighting Unity's CharacterController, I finally got smooth movement working! 🎉\n\nKey lessons:\n• Always use FixedUpdate for physics\n• Ground detection needs a small offset\n• Slope handling is HARD\n\nGame dev is pain but also joy 😅\n\n#atr_q7r8s9t0",
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 18000, // 5 hours ago
          indexedAt: Date.now() / 1000 - 18000,
        },
        {
          id: 3,
          uri: 'at://did:plc:liam.bsky.social/app.bsky.feed.post/3lbx9k3mqw73n',
          feedId: 'feed-game-unity',
          authorDid: 'did:plc:liam.bsky.social',
          text: "Just discovered Unity's new ECS (Entity Component System) and WOW 🤯\n\n100,000 enemies on screen at 60fps!\n\nDOTS + Job System + Burst Compiler = performance magic\n\nWhy didn't I learn this sooner??\n\n#atr_q7r8s9t0",
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 32400, // 9 hours ago
          indexedAt: Date.now() / 1000 - 32400,
        },
        {
          id: 4,
          uri: 'at://did:plc:olivia.bsky.social/app.bsky.feed.post/3lbw7n4prt85k',
          feedId: 'feed-game-unity',
          authorDid: 'did:plc:olivia.bsky.social',
          text: 'Unity 6 preview is OUT and the lighting improvements are INSANE 🤩\n\nReal-time GI actually works now?\nBaked lighting is 3x faster?\nNew Shader Graph nodes?\n\nMy indie game is about to look AAA on a budget lol\n\n#atr_q7r8s9t0',
          hasMedia: true,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 54000, // 15 hours ago
          indexedAt: Date.now() / 1000 - 54000,
        },
        {
          id: 5,
          uri: 'at://did:plc:noah.bsky.social/app.bsky.feed.post/3lbv2m7kp93w',
          feedId: 'feed-game-unity',
          authorDid: 'did:plc:noah.bsky.social',
          text: 'Small indie dev rant:\n\nWhy does every Unity tutorial use singleton pattern for EVERYTHING? 😤\n\nGameManager.Instance.PlayerManager.Instance.HealthSystem.Instance...\n\nLet me introduce you to dependency injection, people!\n\nClean architecture matters! 🏗️\n\n#atr_q7r8s9t0',
          hasMedia: false,
          langs: ['en'],
          moderationStatus: 'approved',
          createdAt: Date.now() / 1000 - 97200, // 27 hours ago
          indexedAt: Date.now() / 1000 - 97200,
        },
      ],
    },
  };

  const data = feedData[feedId] || {
    feed: {
      id: feedId,
      communityId,
      name: 'Feed Not Found',
      description: '',
      status: 'active',
      hashtag: '#atr_unknown',
      posts7d: 0,
      lastPostAt: null,
      activeUsers7d: 0,
      createdAt: Math.floor(Date.now() / 1000),
    },
    posts: [],
  };

  const mockFeed = data.feed;
  const mockPosts = data.posts;
  const communityName = communityNames[communityId] || communityId;

  // Set context info for sidebar
  useEffect(() => {
    setContextInfo({
      communityName,
      communityId,
      feedName: mockFeed.name,
    });

    return () => {
      clearContextInfo();
    };
  }, [communityName, communityId, mockFeed.name, setContextInfo, clearContextInfo]);

  return (
    <FeedDetail
      feed={mockFeed}
      posts={mockPosts}
      isAuthenticated={session.isAuthenticated}
      agent={agent}
      communityName={communityName}
      communityId={communityId}
    />
  );
}
