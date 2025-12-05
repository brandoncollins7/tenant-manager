import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Camera,
  BarChart3,
  Bell,
  ArrowRightLeft,
  TrendingUp,
  Home,
  Users,
  Calendar,
  Eye,
  FileText,
  Wrench,
  MessageSquareWarning,
} from 'lucide-react';

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Home className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Say Goodbye to Chore Drama
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Finally know who's responsible, who's done their part, and who needs a
          friendly reminder.
        </p>
      </div>

      {/* Problem Section */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sound familiar?
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤷</span>
              <p className="text-gray-600">
                "Who was supposed to clean the kitchen this week?"
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">😤</span>
              <p className="text-gray-600">
                "Did anyone actually do the bathroom?"
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">😩</span>
              <p className="text-gray-600">
                "I always end up doing more than my share..."
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-primary-600 font-medium">
              We built this app to fix all of that.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          How It Makes Your Life Easier
        </h2>
        <div className="grid gap-4">
          <FeatureCard
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100"
            title="Clear Assignments"
            description="Everyone knows their chore day. No more confusion or excuses."
          />
          <FeatureCard
            icon={<Camera className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-100"
            title="Photo Proof"
            description="Tenants snap a pic when done. You can see it's actually clean."
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6 text-purple-600" />}
            iconBg="bg-purple-100"
            title="Completion Tracking"
            description="Your dashboard shows who did what and when. At a glance."
          />
          <FeatureCard
            icon={<Bell className="w-6 h-6 text-red-600" />}
            iconBg="bg-red-100"
            title="Overdue Alerts"
            description="Know immediately when someone misses their chore day."
          />
          <FeatureCard
            icon={<ArrowRightLeft className="w-6 h-6 text-orange-600" />}
            iconBg="bg-orange-100"
            title="Easy Swap Requests"
            description="Tenants can trade days with each other without bothering you."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-teal-600" />}
            iconBg="bg-teal-100"
            title="Stats & History"
            description="See completion rates over time. Spot patterns and keep things fair."
          />
          <FeatureCard
            icon={<FileText className="w-6 h-6 text-indigo-600" />}
            iconBg="bg-indigo-100"
            title="Lease Tracking"
            description="Store lease documents and track start/end dates. Never lose paperwork again."
          />
          <FeatureCard
            icon={<Wrench className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-100"
            title="Supply & Maintenance Requests"
            description="Tenants can request cleaning supplies or report repairs. No more random texts."
          />
          <FeatureCard
            icon={<MessageSquareWarning className="w-6 h-6 text-rose-600" />}
            iconBg="bg-rose-100"
            title="Concern Reporting"
            description="Tenants can report issues with roommates privately. Handle problems before they escalate."
          />
        </div>
      </div>

      {/* How It Works Section */}
      <div className="px-6 py-8 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          How It Works
        </h2>
        <div className="space-y-4">
          <Step
            number={1}
            icon={<Home className="w-5 h-5" />}
            title="Set Up Your Property"
            description="Add your unit and create rooms for each tenant space"
          />
          <Step
            number={2}
            icon={<Users className="w-5 h-5" />}
            title="Add Your Tenants"
            description="Invite tenants and assign each person a chore day"
          />
          <Step
            number={3}
            icon={<Calendar className="w-5 h-5" />}
            title="Tenants Do Their Chores"
            description="They get reminders and mark chores complete with photos"
          />
          <Step
            number={4}
            icon={<Eye className="w-5 h-5" />}
            title="You See Everything"
            description="Check your dashboard to see who's on track (or not)"
          />
        </div>
      </div>

      {/* What You'll See Section */}
      <div className="px-6 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          Your Manager Dashboard
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Everything you need to know, in one place
        </p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <DashboardPreviewItem
            label="Pending Requests"
            value="3"
            color="text-yellow-600"
          />
          <DashboardPreviewItem
            label="Overdue Chores"
            value="1"
            color="text-red-600"
          />
          <DashboardPreviewItem
            label="Completion Rate"
            value="94%"
            color="text-green-600"
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Ready to make chores stress-free?
        </h2>
        <p className="text-gray-600 mb-6">
          Your tenants will thank you. (And actually do their chores.)
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl shadow-lg hover:bg-primary-700 transition-colors"
        >
          Get Started
        </Link>
      </div>

      {/* Footer */}
      <div className="px-6 py-8 text-center text-gray-500 text-sm border-t border-gray-100">
        <p>Chore Manager - Making shared living easier</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-4">
      <div
        className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
        {number}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary-600">{icon}</span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function DashboardPreviewItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-gray-700">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
