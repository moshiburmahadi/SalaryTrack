@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@400;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", serif;
  --font-mono: "JetBrains Mono", monospace;
  
  --color-gold-accent: #C5A059;
  --color-purple-premium: #A855F7;
  --color-dark-bg: #050505;
  --color-card-bg: #0D0D0D;
  --color-border-dark: #1A1A1A;
  --color-text-primary: #E5E5E5;
  --color-cyber-cyan: #00F3FF;
  --color-cyber-green: #00FF41;

  @keyframes premium-glow {
    0%, 100% { filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.4)); opacity: 0.8; }
    50% { filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.8)); opacity: 1; }
  }

  @keyframes scanline {
    0% { transform: translateY(-10vh); }
    100% { transform: translateY(110vh); }
  }

  @keyframes flicker {
    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
    20%, 22%, 24%, 55% { opacity: 0.5; }
  }
}

.animate-premium-glow {
  animation: premium-glow 2s ease-in-out infinite;
}

.animate-scanline {
  animation: scanline 8s linear infinite;
}

.animate-cyber-flicker {
  animation: flicker 4s infinite;
}

body {
  @apply bg-dark-bg text-text-primary;
}

.serif {
  @apply font-serif;
}

.mono {
  @apply font-mono;
}

.gold-accent {
  @apply text-gold-accent;
}

.tracker-card {
  @apply bg-card-bg border border-border-dark rounded;
}

.cyber-grid {
  background-image: linear-gradient(rgba(197, 160, 89, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(197, 160, 89, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
}

.hud-corner {
  @apply relative;
}

.hud-corner::before {
  content: '';
  @apply absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-gold-accent/40;
}

.hud-corner::after {
  content: '';
  @apply absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-gold-accent/40;
}

.cyber-panel {
  @apply bg-black/40 backdrop-blur-sm border border-border-dark relative overflow-hidden;
}

.cyber-panel::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-b from-gold-accent/5 to-transparent opacity-10 pointer-events-none;
}
