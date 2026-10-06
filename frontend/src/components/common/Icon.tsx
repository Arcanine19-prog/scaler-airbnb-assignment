import {
  AirVent, AlarmSmoke, Bath, BriefcaseMedical, Building2, Coffee, CookingPot, Dumbbell, FireExtinguisher, Flame,
  FlameKindling, Flower2, Gem, Heater, KeyRound, Landmark, Laptop, Mountain, PawPrint, PlugZap, Sailboat, Shapes,
  ShieldAlert, Shirt, SquareParking, Sun, Tractor, TreePalm, TreePine, Tv, Umbrella, WashingMachine, Waves, Wheat,
  Wifi, Wind, Sparkles, type LucideIcon, type LucideProps,
} from "lucide-react";

/**
 * Categories and amenities store an icon *name* in the database. Mapping names to components
 * explicitly (instead of importing every lucide icon) keeps the bundle small.
 */
const ICONS: Record<string, LucideIcon> = {
  AirVent, AlarmSmoke, Bath, BriefcaseMedical, Building2, Coffee, CookingPot, Dumbbell, FireExtinguisher, Flame,
  FlameKindling, Flower2, Gem, Heater, KeyRound, Landmark, Laptop, Mountain, PawPrint, PlugZap, Sailboat, Shapes,
  ShieldAlert, Shirt, SquareParking, Sun, Tractor, TreePalm, TreePine, Tv, Umbrella, WashingMachine, Waves, Wheat,
  Wifi, Wind,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Component = ICONS[name] ?? Sparkles;
  return <Component strokeWidth={1.5} {...props} />;
}
