import { Link } from 'react-router-dom'

const PAGE_CONTEXT = {
  '/dashboard': {
    left: {
      label: 'Training rhythm',
      title: 'Build consistency',
      body: 'Use your weekly overview to balance planned workouts with the runs you have logged.',
      action: 'Open your calendar',
      to: '/calendar',
    },
    right: {
      label: 'Quick action',
      title: 'Ready to run?',
      body: 'Start a GPS-tracked run or record a workout you completed earlier.',
      action: 'Start a run',
      to: '/run',
    },
  },
  '/calendar': {
    left: {
      label: 'Plan your week',
      title: 'Keep your schedule flexible',
      body: 'Choose a workout to review its distance, target pace, and planned start time.',
      action: 'Review training plan',
      to: '/plan',
    },
    right: {
      label: 'After your workout',
      title: 'Log what you complete',
      body: 'Use Start a Run for GPS tracking. A run linked to a workout stops at its planned distance.',
      action: 'Start a run',
      to: '/run',
    },
  },
  '/run': {
    left: {
      label: 'Before you start',
      title: 'Get a clear GPS signal',
      body: 'Allow location access and keep this page open while recording so RunPlan can track your route.',
      action: 'View today’s calendar',
      to: '/calendar',
    },
    right: {
      label: 'When you finish',
      title: 'Save your activity',
      body: 'Review the recorded time and distance before saving. Linked workouts are completed when their target is reached.',
      action: 'View run history',
      to: '/activities',
    },
  },
  '/activities': {
    left: {
      label: 'Run history',
      title: 'Keep each entry accurate',
      body: 'Enter the run date, distance, and duration. RunPlan uses saved activities in your training summaries.',
      action: 'Start a GPS run',
      to: '/run',
    },
    right: {
      label: 'Training context',
      title: 'Compare with your plan',
      body: 'Your calendar shows which planned workouts are upcoming, completed, or still open.',
      action: 'Open calendar',
      to: '/calendar',
    },
  },
  '/plan': {
    left: {
      label: 'Plan workflow',
      title: 'Start with your profile',
      body: 'Your goal, experience, available days, and recent running baseline help shape a suitable schedule.',
      action: 'Edit runner profile',
      to: '/profile',
    },
    right: {
      label: 'Review changes',
      title: 'Check the calendar',
      body: 'After generating or revising a plan, review the schedule and workout details in your calendar.',
      action: 'Open calendar',
      to: '/calendar',
    },
  },
  '/profile': {
    left: {
      label: 'Training preferences',
      title: 'Keep your baseline current',
      body: 'Your experience, available days, goal, and recent run details guide training-plan recommendations.',
      action: 'View training plan',
      to: '/plan',
    },
    right: {
      label: 'Your account',
      title: 'Manage sign-in settings',
      body: 'Review account security and update your password from Account & Security.',
      action: 'Open account settings',
      to: '/account',
    },
  },
  '/account': {
    left: {
      label: 'Account security',
      title: 'Protect your sign-in',
      body: 'Use a unique password and keep your sign-in details private.',
      action: 'Review runner profile',
      to: '/profile',
    },
    right: {
      label: 'Need help?',
      title: 'Check RunPlan status',
      body: 'The status page summarizes the services used by your RunPlan account.',
      action: 'View system status',
      to: '/status',
    },
  },
  '/status': {
    left: {
      label: 'System overview',
      title: 'Check service availability',
      body: 'Review the current API and application status if a page or action is not responding.',
      action: 'Return to dashboard',
      to: '/dashboard',
    },
    right: {
      label: 'Account help',
      title: 'Check your profile settings',
      body: 'Some training features use your profile preferences and account settings.',
      action: 'Open runner profile',
      to: '/profile',
    },
  },
}

export default function PageContext({ pathname, side }) {
  const content =
    PAGE_CONTEXT[pathname]?.[side] ??
    PAGE_CONTEXT['/dashboard'][side]

  return (
    <section className="page-context-card">
      <span className="page-context-label">{content.label}</span>
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <Link className="page-context-link" to={content.to}>
        {content.action}
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  )
}