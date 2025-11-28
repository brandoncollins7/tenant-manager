export const WELCOME_CONTENT = {
  title: 'Welcome to Rentably!',
  subtitle: "Here's what you need to know to get started.",
  sections: [
    {
      icon: 'Calendar',
      title: 'Your Chore Day',
      text: 'Each person in your household has an assigned chore day. On that day, you\'re responsible for completing shared chores. Check your assigned day in your Profile.',
    },
    {
      icon: 'CheckCircle',
      title: 'Complete Your Chores',
      text: 'When it\'s your chore day, you\'ll see your tasks on the Dashboard. Tap any chore to mark it complete.',
    },
    {
      icon: 'Camera',
      title: 'Photo Proof (Optional)',
      text: 'Taking a photo helps verify the chore was done. It\'s optional but recommended, especially for cleaning tasks.',
    },
    {
      icon: 'ArrowLeftRight',
      title: 'Request a Swap',
      text: 'Can\'t do your day? Request a swap with a housemate from the Swaps tab. They\'ll get a notification and can approve or decline.',
    },
  ],
};

export const QUICK_START_CONTENT = [
  {
    icon: 'Home',
    title: 'Dashboard',
    text: 'Your home screen shows today\'s chores if it\'s your day. Tap any chore card to mark it complete.',
  },
  {
    icon: 'Calendar',
    title: 'Weekly Schedule',
    text: 'View the full week\'s schedule in the Chores tab. See who\'s assigned to each day.',
  },
  {
    icon: 'ArrowLeftRight',
    title: 'Swaps',
    text: 'The Swaps tab lets you request day swaps and respond to requests from others.',
  },
  {
    icon: 'User',
    title: 'Profile',
    text: 'Check your assigned chore day, view your completion stats, and sign out.',
  },
];

export const FAQ_CONTENT = [
  {
    question: 'What if I miss my chore day?',
    answer:
      'If you don\'t complete your chores by the end of your assigned day, they\'ll be marked as "Missed". Try to request a swap ahead of time if you know you\'ll be unavailable.',
  },
  {
    question: 'Can I swap with anyone?',
    answer:
      'You can only swap with other members of your household (your unit). The person you\'re swapping with must approve the request.',
  },
  {
    question: 'How do I add a roommate?',
    answer:
      'Contact your property manager to add new occupants to your unit. They\'ll set up their chore day assignment.',
  },
  {
    question: 'Why should I take photos?',
    answer:
      'Photos are optional but help verify completion. They\'re especially useful if there are disputes about whether a task was done properly.',
  },
  {
    question: 'What happens if my swap is rejected?',
    answer:
      'If someone declines your swap request, you\'re still responsible for your original chore day. Try requesting with a different person or complete your chores as scheduled.',
  },
  {
    question: 'Where can I see my completion history?',
    answer:
      'Your completion stats are shown on the Profile page, including how many chores you\'ve completed vs. missed and your overall completion rate.',
  },
];
