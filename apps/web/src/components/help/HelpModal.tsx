import { useState } from 'react';
import {
  Home,
  Calendar,
  ArrowLeftRight,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { QUICK_START_CONTENT, FAQ_CONTENT } from './helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  Home,
  Calendar,
  ArrowLeftRight,
  User,
};

type Tab = 'quickstart' | 'faq';

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('quickstart');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help & FAQ">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('quickstart')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'quickstart'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Quick Start
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'faq'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          FAQ
        </button>
      </div>

      {/* Quick Start Content */}
      {activeTab === 'quickstart' && (
        <div className="space-y-4">
          {QUICK_START_CONTENT.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ Content */}
      {activeTab === 'faq' && (
        <div className="space-y-2">
          {FAQ_CONTENT.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 touch-target"
              >
                <span className="font-medium text-gray-900 pr-4">
                  {item.question}
                </span>
                {expandedFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
