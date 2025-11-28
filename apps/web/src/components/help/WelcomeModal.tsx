import { Calendar, CheckCircle, Camera, ArrowLeftRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { WELCOME_CONTENT } from './helpContent';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  Calendar,
  CheckCircle,
  Camera,
  ArrowLeftRight,
};

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} trackingId="welcome-onboarding">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">👋</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{WELCOME_CONTENT.title}</h2>
        <p className="text-gray-600 mt-1">{WELCOME_CONTENT.subtitle}</p>
      </div>

      <div className="space-y-4">
        {WELCOME_CONTENT.sections.map((section, index) => {
          const Icon = iconMap[section.icon as keyof typeof iconMap];
          return (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{section.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Button onClick={onClose} className="w-full">
          Get Started
        </Button>
      </div>
    </Modal>
  );
}
