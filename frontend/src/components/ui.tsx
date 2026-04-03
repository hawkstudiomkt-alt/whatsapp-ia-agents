import { motion } from 'framer-motion';

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  glow?: 'lime' | 'purple' | 'none';
}

export function Card({ children, className = '', delay = 0, glow = 'none' }: CardProps) {
  const glowStyle =
    glow === 'lime'   ? { boxShadow: '0 0 30px rgba(182,255,0,0.08)'   } :
    glow === 'purple' ? { boxShadow: '0 0 30px rgba(125,83,255,0.08)'  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      style={glowStyle}
      className={`bg-[#0e0e0e] border border-[rgba(255,255,255,0.06)] rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary:   'bg-[#B6FF00] text-black font-bold hover:opacity-90 shadow-[0_0_20px_rgba(182,255,0,0.25)] hover:shadow-[0_0_30px_rgba(182,255,0,0.4)]',
    secondary: 'bg-[#141414] text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] hover:bg-[#1a1a1a]',
    danger:    'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-500 hover:to-rose-600 shadow-lg shadow-red-900/30',
    ghost:     'bg-transparent text-gray-400 hover:text-white hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-medium transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'lime' | 'purple';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variants = {
    lime:    'bg-[rgba(182,255,0,0.1)] text-[#B6FF00] border-[rgba(182,255,0,0.25)]',
    purple:  'bg-[rgba(125,83,255,0.1)] text-[#7D53FF] border-[rgba(125,83,255,0.25)]',
    success: 'bg-[rgba(182,255,0,0.08)] text-[#B6FF00] border-[rgba(182,255,0,0.2)]',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    danger:  'bg-red-500/10 text-red-400 border-red-500/20',
    info:    'bg-[rgba(125,83,255,0.1)] text-[#7D53FF] border-[rgba(125,83,255,0.2)]',
    neutral: 'bg-white/5 text-gray-400 border-white/10',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border font-[Space_Mono,monospace] tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, color, delay = 0 }: StatCardProps) {
  return (
    <Card delay={delay} className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#555] text-xs uppercase tracking-widest font-mono-rattix">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      className="w-7 h-7 border-2 border-[#B6FF00] border-t-transparent rounded-full"
    />
  );
}

// ─── PageTransition ───────────────────────────────────────────────────────────
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}
