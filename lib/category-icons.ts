import {
    Utensils,
    ShoppingBag,
    Wallet,
    Home,
    Receipt,
    Car,
    Film,
    Heart,
    GraduationCap,
    MoreHorizontal,
    Sparkles,
    type LucideIcon
} from 'lucide-react';

// Category to icon mapping for predefined categories
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    // Food & Dining
    'Food': Utensils,
    'Dining': Utensils,
    'Restaurant': Utensils,
    'Groceries': ShoppingBag,

    // Shopping
    'Shopping': ShoppingBag,

    // Income
    'Salary': Wallet,
    'Income': Wallet,
    'Freelance': Wallet,

    // Housing
    'Rent': Home,
    'Housing': Home,
    'Home': Home,

    // Bills & Utilities
    'Bills': Receipt,
    'Utilities': Receipt,
    'Electricity': Receipt,
    'Water': Receipt,
    'Gas': Receipt,
    'Internet': Receipt,
    'Phone': Receipt,

    // Transport
    'Transport': Car,
    'Transportation': Car,
    'Fuel': Car,
    'Petrol': Car,
    'Travel': Car,

    // Entertainment
    'Entertainment': Film,
    'Movies': Film,
    'Subscriptions': Film,
    'Netflix': Film,

    // Health
    'Health': Heart,
    'Medical': Heart,
    'Medicine': Heart,
    'Hospital': Heart,
    'Gym': Heart,
    'Fitness': Heart,

    // Education
    'Education': GraduationCap,
    'Books': GraduationCap,
    'Courses': GraduationCap,
    'School': GraduationCap,
    'College': GraduationCap,

    // Other
    'Other': MoreHorizontal,
    'Miscellaneous': MoreHorizontal,
};

// Default icon for user-defined categories
export const DEFAULT_CATEGORY_ICON: LucideIcon = Sparkles;

// Get icon for a category (case-insensitive)
export function getCategoryIcon(category: string): LucideIcon {
    // Try exact match first
    if (CATEGORY_ICONS[category]) {
        return CATEGORY_ICONS[category];
    }

    // Try case-insensitive match
    const lowerCategory = category.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (key.toLowerCase() === lowerCategory) {
            return icon;
        }
    }

    // Return default icon for user-defined categories
    return DEFAULT_CATEGORY_ICON;
}

// Check if a category is predefined (has a specific icon)
export function isPredefinedCategory(category: string): boolean {
    const lowerCategory = category.toLowerCase();
    return Object.keys(CATEGORY_ICONS).some(key => key.toLowerCase() === lowerCategory);
}
