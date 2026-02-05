/**
 * Story Registry - Contains metadata and thumbnails for all available stories
 */

export interface StoryInfo {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  author: string;
  tags: string[];
  thumbnail: string; // SVG data URL
  difficulty: 'easy' | 'medium' | 'challenging';
  estimatedTime: string;
  featured?: boolean;
}

// SVG Thumbnails for each story
const thumbnails = {
  detective: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="detective-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="100%" style="stop-color:#0d0d1a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#detective-bg)"/>
    <circle cx="160" cy="30" r="20" fill="#3d3d5c" opacity="0.5"/>
    <rect x="20" y="80" width="60" height="70" fill="#252540" rx="2"/>
    <rect x="90" y="60" width="50" height="90" fill="#1f1f35" rx="2"/>
    <rect x="150" y="70" width="40" height="80" fill="#252540" rx="2"/>
    <rect x="25" y="90" width="15" height="20" fill="#4a4a6a"/>
    <rect x="50" y="95" width="15" height="15" fill="#4a4a6a"/>
    <circle cx="50" cy="120" r="15" fill="none" stroke="#7c3aed" stroke-width="3"/>
    <line x1="60" y1="130" x2="75" y2="145" stroke="#7c3aed" stroke-width="3"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">MYSTERY</text>
  </svg>`,

  haunted: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="haunted-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a0a1a"/>
        <stop offset="100%" style="stop-color:#0d0d1a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#haunted-bg)"/>
    <circle cx="150" cy="25" r="15" fill="#4a4a6a" opacity="0.3"/>
    <path d="M60 150 L60 70 L100 40 L140 70 L140 150" fill="#1a1a2e"/>
    <path d="M100 40 L100 70" stroke="#252540" stroke-width="2"/>
    <rect x="75" y="90" width="20" height="30" fill="#2d1f3d"/>
    <rect x="105" y="90" width="20" height="25" fill="#2d1f3d"/>
    <rect x="90" y="120" width="20" height="30" fill="#1f1f35"/>
    <circle cx="100" cy="135" r="2" fill="#7c3aed"/>
    <path d="M70 60 Q100 30 130 60" fill="none" stroke="#3d3d5c" stroke-width="1"/>
    <circle cx="85" cy="100" r="3" fill="#a78bfa" opacity="0.6"/>
    <circle cx="115" cy="95" r="2" fill="#a78bfa" opacity="0.4"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">HORROR</text>
  </svg>`,

  starship: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="space-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0a0a15"/>
        <stop offset="100%" style="stop-color:#1a1a2e"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#space-bg)"/>
    <circle cx="30" cy="20" r="1" fill="#fff"/>
    <circle cx="80" cy="40" r="1.5" fill="#fff"/>
    <circle cx="170" cy="30" r="1" fill="#fff"/>
    <circle cx="150" cy="80" r="1" fill="#fff"/>
    <circle cx="40" cy="100" r="1.5" fill="#fff"/>
    <circle cx="180" cy="120" r="1" fill="#fff"/>
    <ellipse cx="100" cy="75" rx="50" ry="15" fill="#252540"/>
    <ellipse cx="100" cy="75" rx="35" ry="10" fill="#1f1f35"/>
    <path d="M50 75 L30 85 L30 95 L50 85" fill="#3d3d5c"/>
    <path d="M150 75 L170 85 L170 95 L150 85" fill="#3d3d5c"/>
    <circle cx="100" cy="75" r="8" fill="#7c3aed" opacity="0.8"/>
    <ellipse cx="100" cy="75" rx="3" ry="2" fill="#a78bfa"/>
    <path d="M70 90 L75 110 L85 110 L80 90" fill="#6366f1" opacity="0.6"/>
    <path d="M130 90 L125 110 L115 110 L120 90" fill="#6366f1" opacity="0.6"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">SCI-FI</text>
  </svg>`,

  dragon: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fantasy-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1520"/>
        <stop offset="100%" style="stop-color:#0d0d1a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#fantasy-bg)"/>
    <path d="M0 150 L40 100 L80 120 L120 90 L160 110 L200 80 L200 150 Z" fill="#252540"/>
    <path d="M0 150 L30 120 L60 130 L100 110 L140 125 L200 100 L200 150 Z" fill="#1a1a2e"/>
    <path d="M100 20 Q120 40 110 60 Q130 50 140 70 Q125 65 120 80 Q110 70 100 75 Q90 70 80 80 Q75 65 60 70 Q70 50 90 60 Q80 40 100 20" fill="#ef4444" opacity="0.8"/>
    <circle cx="95" cy="50" r="3" fill="#fbbf24"/>
    <circle cx="105" cy="50" r="3" fill="#fbbf24"/>
    <path d="M90 60 L100 70 L110 60" fill="none" stroke="#dc2626" stroke-width="2"/>
    <path d="M60 90 L65 70 L70 90" fill="#7c3aed"/>
    <path d="M130 85 L135 65 L140 85" fill="#7c3aed"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">FANTASY</text>
  </svg>`,

  cafe: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cozy-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#2d1f1a"/>
        <stop offset="100%" style="stop-color:#1a1515"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#cozy-bg)"/>
    <rect x="30" y="70" width="140" height="80" fill="#252525" rx="3"/>
    <rect x="40" y="60" width="120" height="15" fill="#3d3530"/>
    <rect x="60" y="85" width="30" height="40" fill="#4a3f35"/>
    <rect x="110" y="85" width="30" height="40" fill="#4a3f35"/>
    <ellipse cx="100" cy="62" rx="15" ry="5" fill="#5c4a3a"/>
    <path d="M85 55 Q100 35 115 55" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
    <circle cx="170" cy="30" r="25" fill="#fbbf24" opacity="0.15"/>
    <path d="M80 100 Q85 90 95 100 Q100 95 105 100" fill="none" stroke="#ec4899" stroke-width="2" opacity="0.8"/>
    <circle cx="50" cy="50" r="2" fill="#f59e0b" opacity="0.5"/>
    <circle cx="150" cy="55" r="2" fill="#f59e0b" opacity="0.5"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">ROMANCE</text>
  </svg>`,

  cyber: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cyber-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#0a1015"/>
        <stop offset="100%" style="stop-color:#1a0a1a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#cyber-bg)"/>
    <rect x="20" y="40" width="15" height="110" fill="#1a1a2e"/>
    <rect x="45" y="30" width="20" height="120" fill="#252540"/>
    <rect x="75" y="50" width="25" height="100" fill="#1f1f35"/>
    <rect x="110" y="35" width="18" height="115" fill="#252540"/>
    <rect x="140" y="45" width="22" height="105" fill="#1a1a2e"/>
    <rect x="170" y="55" width="15" height="95" fill="#1f1f35"/>
    <line x1="25" y1="60" x2="25" y2="80" stroke="#ec4899" stroke-width="2"/>
    <line x1="55" y1="45" x2="55" y2="70" stroke="#06b6d4" stroke-width="2"/>
    <line x1="87" y1="65" x2="87" y2="95" stroke="#a78bfa" stroke-width="2"/>
    <line x1="119" y1="50" x2="119" y2="75" stroke="#10b981" stroke-width="2"/>
    <line x1="151" y1="60" x2="151" y2="90" stroke="#f59e0b" stroke-width="2"/>
    <rect x="48" y="100" width="8" height="12" fill="#ec4899" opacity="0.8"/>
    <rect x="113" y="95" width="6" height="10" fill="#06b6d4" opacity="0.8"/>
    <rect x="143" y="105" width="10" height="8" fill="#a78bfa" opacity="0.8"/>
    <path d="M0 130 Q50 120 100 130 Q150 140 200 125" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
    <text x="100" y="145" fill="#6b6b80" font-size="8" text-anchor="middle">CYBERPUNK</text>
  </svg>`,
};

// Convert SVG to data URL
const toDataUrl = (svg: string): string => {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
};

export const storyRegistry: StoryInfo[] = [
  {
    id: 'detective-mystery-001',
    title: 'The Vanishing Heiress',
    shortDescription: 'A noir detective mystery with shocking betrayals.',
    description: 'You are a private detective called to investigate the disappearance of Eleanor Ashworth, heir to the Ashworth fortune. As you dig deeper, trusted allies reveal hidden agendas, a devastating midpoint revelation turns everything upside down, and just when victory seems near, the truth proves far darker than anyone imagined. Navigate a web of lies across three acts of escalating tension, experience a heart-stopping "all is lost" moment, and uncover who\'s really pulling the strings.',
    author: 'Network Narrative Engine',
    tags: ['mystery', 'noir', 'detective'],
    thumbnail: toDataUrl(thumbnails.detective),
    difficulty: 'medium',
    estimatedTime: '45-60 min',
    featured: true,
  },
  {
    id: 'haunted-manor-001',
    title: 'Whispers of Blackwood Manor',
    shortDescription: 'Gothic horror with supernatural twists.',
    description: 'You are a paranormal investigator called to Blackwood Manor, an estate plagued by unexplained phenomena. The Blackwood family\'s dark history spans centuries, but nothing prepares you for the midpoint betrayal that changes everything. Face escalating supernatural horrors, survive false victories that lure you deeper, and confront the devastating truth at your darkest hour. Some spirits don\'t just want to be heard—they want revenge.',
    author: 'Network Narrative Engine',
    tags: ['horror', 'supernatural', 'gothic'],
    thumbnail: toDataUrl(thumbnails.haunted),
    difficulty: 'challenging',
    estimatedTime: '50-70 min',
  },
  {
    id: 'starship-odyssey-001',
    title: 'Starship Odyssey: The Last Frontier',
    shortDescription: 'Epic space drama with shocking revelations.',
    description: 'As captain of the USV Horizon, humanity\'s last colony ship, you must navigate a dying galaxy. With 10,000 souls in cryosleep depending on you, every decision could mean salvation or extinction. But a devastating midpoint revelation about the mission\'s true purpose tests everything you believe. Experience crew betrayals, false hopes of sanctuary, and an "all is lost" moment that forces impossible sacrifices. What will you become to save humanity?',
    author: 'Network Narrative Engine',
    tags: ['sci-fi', 'space', 'survival', 'leadership'],
    thumbnail: toDataUrl(thumbnails.starship),
    difficulty: 'challenging',
    estimatedTime: '60-80 min',
    featured: true,
  },
  {
    id: 'dragon-heir-001',
    title: 'The Dragon\'s Heir',
    shortDescription: 'Fantasy epic with political intrigue and betrayal.',
    description: 'In the kingdom of Valdris, you discover you carry dragon blood—a power that could save or destroy the realm. With civil war looming and ancient enemies awakening, your journey spans three acts of escalating stakes. A trusted mentor\'s shocking betrayal at the midpoint shatters your alliances, false victories lead to devastating setbacks, and when all seems lost, you must decide what kind of ruler—or destroyer—you will become.',
    author: 'Network Narrative Engine',
    tags: ['fantasy', 'dragons', 'royalty', 'war'],
    thumbnail: toDataUrl(thumbnails.dragon),
    difficulty: 'medium',
    estimatedTime: '50-65 min',
  },
  {
    id: 'cafe-hearts-001',
    title: 'The Starlight Cafe',
    shortDescription: 'Heartfelt romance with dramatic twists.',
    description: 'You inherit your grandmother\'s struggling cafe in a charming coastal town. Between perfecting recipes, navigating small-town drama, and unexpected romance, your story takes dramatic turns. A midpoint revelation about your grandmother\'s secret past changes everything, a romantic false victory leads to heartbreak, and when the cafe faces its darkest hour, you must choose between love, legacy, and starting over. Sometimes the sweetest endings come after the bitterest moments.',
    author: 'Network Narrative Engine',
    tags: ['romance', 'slice-of-life', 'cozy', 'drama'],
    thumbnail: toDataUrl(thumbnails.cafe),
    difficulty: 'easy',
    estimatedTime: '40-55 min',
  },
  {
    id: 'cyber-runner-001',
    title: 'Neon Shadows',
    shortDescription: 'Cyberpunk thriller with corporate conspiracies.',
    description: 'In the sprawling megacity of Neo-Cascadia, you\'re a runner—a data thief for hire. A routine job spirals into a corporate conspiracy that could change humanity forever. Your trusted fixer\'s midpoint betrayal puts a price on your head, a false victory hack exposes you to even greater danger, and when you\'re cornered with no way out, you must decide what\'s worth more: survival, the truth, or burning it all down. Jack in for an unforgettable ride.',
    author: 'Network Narrative Engine',
    tags: ['cyberpunk', 'thriller', 'noir', 'tech'],
    thumbnail: toDataUrl(thumbnails.cyber),
    difficulty: 'medium',
    estimatedTime: '50-65 min',
    featured: true,
  },
];

export function getStoryById(id: string): StoryInfo | undefined {
  return storyRegistry.find(story => story.id === id);
}

export function getFeaturedStories(): StoryInfo[] {
  return storyRegistry.filter(story => story.featured);
}

export function getStoriesByTag(tag: string): StoryInfo[] {
  return storyRegistry.filter(story => story.tags.includes(tag.toLowerCase()));
}

// User-created stories storage (session-based for now)
let userCreatedStories: StoryInfo[] = [];

// Storage for user story graph data (needed to play user-created stories)
// Uses unknown type to avoid circular dependency with storyCreation types
const userStoryGraphs: Map<string, unknown> = new Map();

export function addUserStory(story: StoryInfo, graphData?: unknown): void {
  // Remove if exists (update)
  userCreatedStories = userCreatedStories.filter(s => s.id !== story.id);
  userCreatedStories.push(story);

  // Store graph data if provided
  if (graphData) {
    userStoryGraphs.set(story.id, graphData);
  }
}

export function getUserStoryGraph(id: string): unknown | undefined {
  return userStoryGraphs.get(id);
}

export function removeUserStory(id: string): void {
  userCreatedStories = userCreatedStories.filter(s => s.id !== id);
  userStoryGraphs.delete(id);
}

export function getUserStories(): StoryInfo[] {
  return [...userCreatedStories];
}

export function getAllStories(): StoryInfo[] {
  return [...storyRegistry, ...userCreatedStories];
}

export function getAllStoriesByTag(tag: string): StoryInfo[] {
  return getAllStories().filter(story => story.tags.includes(tag.toLowerCase()));
}

export function getAllFeaturedStories(): StoryInfo[] {
  return getAllStories().filter(story => story.featured);
}

// Generate a placeholder thumbnail for user stories
export function generateUserStoryThumbnail(title: string, tags: string[]): string {
  const primaryTag = tags[0] || 'adventure';
  const colors: Record<string, [string, string]> = {
    mystery: ['#1a1a2e', '#7c3aed'],
    horror: ['#1a0a1a', '#ef4444'],
    'sci-fi': ['#0a0a15', '#06b6d4'],
    fantasy: ['#1a1520', '#f59e0b'],
    romance: ['#2d1f1a', '#ec4899'],
    cyberpunk: ['#0a1015', '#a78bfa'],
    thriller: ['#1a1a2e', '#ef4444'],
    adventure: ['#1a2520', '#10b981'],
    drama: ['#1a1a2e', '#6366f1'],
    default: ['#1a1a2e', '#7c3aed'],
  };

  const [bg, accent] = colors[primaryTag] || colors.default;
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const svg = `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="user-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bg}"/>
        <stop offset="100%" style="stop-color:#0d0d1a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="150" fill="url(#user-bg)"/>
    <circle cx="100" cy="65" r="35" fill="${accent}" opacity="0.2"/>
    <text x="100" y="75" fill="${accent}" font-size="28" font-weight="bold" text-anchor="middle" font-family="sans-serif">${initials}</text>
    <text x="100" y="135" fill="#6b6b80" font-size="10" text-anchor="middle" font-family="sans-serif">USER CREATED</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}
