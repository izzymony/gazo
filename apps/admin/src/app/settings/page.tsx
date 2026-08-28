"use client";

import React, { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { 
  Settings, 
  Save,
  RefreshCcw,
  Shield,
  Globe,
  CreditCard,
  Mail,
  Bell,
  Users,
  Store,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Upload,
  Download,
  Key,
  Database,
  Cloud,
  Lock,
  Zap
} from "lucide-react";

// Mock system settings data
const systemSettings = {
  platform: {
    siteName: "Vibaar Admin",
    siteDescription: "Nigerian Social Commerce Platform Administration",
    maintenanceMode: false,
    debugMode: false,
    apiRateLimit: 1000,
    maxFileSize: "10MB",
    allowedFileTypes: [".jpg", ".jpeg", ".png", ".gif", ".pdf"]
  },
  payments: {
    paystack: {
      enabled: false,
      publicKey: "",
      secretKey: "",
      webhookUrl: ""
    },
    flutterwave: {
      enabled: false,
      publicKey: "",
      secretKey: "",
      webhookUrl: ""
    },
    commissionRate: 0,
    withdrawalMinimum: 0,
    withdrawalFee: 0
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    adminEmailAlerts: true,
    customerEmailAlerts: true,
    orderNotifications: true,
    paymentNotifications: true,
    systemAlerts: true
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordPolicy: "strong",
    ipWhitelist: [],
    apiKeyRotation: 90,
    encryptionEnabled: true,
    auditLogging: true
  },
  integrations: {
    shipping: {
      gigLogistics: { enabled: false, apiKey: "" },
      dhl: { enabled: false, apiKey: "" },
      fedex: { enabled: false, apiKey: "" }
    },
    analytics: {
      googleAnalytics: { enabled: false, trackingId: "" },
      facebookPixel: { enabled: false, pixelId: "" },
      customAnalytics: { enabled: false, endpoint: "" }
    },
    social: {
      instagram: { enabled: false, clientId: "" },
      facebook: { enabled: false, appId: "" },
      tiktok: { enabled: false, appId: "" }
    }
  },
  performance: {
    cacheEnabled: true,
    cacheExpiry: 3600,
    cdnEnabled: true,
    compressionEnabled: true,
    lazyLoadingEnabled: true,
    minificationEnabled: true
  }
};

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("platform");
  const [settings, setSettings] = useState(systemSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  const tabs = [
    { key: "platform", label: "Platform Settings", icon: Globe },
    { key: "payments", label: "Payment Configuration", icon: CreditCard },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Security & Access", icon: Shield },
    { key: "integrations", label: "Third-party Integrations", icon: Zap },
    { key: "performance", label: "Performance & Cache", icon: Database }
  ];

  const handleToggle = (section: string, key: string) => {
    setSettings(prev => {
      const prevAny = prev as any;
      return {
        ...prev,
        [section]: {
          ...prevAny[section],
          [key]: !prevAny[section][key]
        }
      };
    });
    setHasChanges(true);
  };

  const handleInputChange = (section: string, key: string, value: string | number) => {
    setSettings(prev => {
      const prevAny = prev as any;
      return {
        ...prev,
        [section]: {
          ...prevAny[section],
          [key]: value
        }
      };
    });
    setHasChanges(true);
  };

  const handleNestedChange = (section: string, subsection: string, key: string, value: any) => {
    setSettings(prev => {
      const prevAny = prev as any;
      return {
        ...prev,
        [section]: {
          ...prevAny[section],
          [subsection]: {
            ...prevAny[section][subsection],
            [key]: value
          }
        }
      };
    });
    setHasChanges(true);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => {
      const prevAny = prev as any;
      return {
        ...prev,
        [key]: !prevAny[key]
      };
    });
  };

  const renderPlatformSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
          <input
            type="text"
            value={settings.platform.siteName}
            onChange={(e) => handleInputChange('platform', 'siteName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Rate Limit (per hour)</label>
          <input
            type="number"
            value={settings.platform.apiRateLimit}
            onChange={(e) => handleInputChange('platform', 'apiRateLimit', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
        <textarea
          value={settings.platform.siteDescription}
          onChange={(e) => handleInputChange('platform', 'siteDescription', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Maintenance Mode</h4>
            <p className="text-xs text-gray-500">Temporarily disable public access</p>
          </div>
          <button
            onClick={() => handleToggle('platform', 'maintenanceMode')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.platform.maintenanceMode ? 'bg-brand' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.platform.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Debug Mode</h4>
            <p className="text-xs text-gray-500">Enable detailed error logging</p>
          </div>
          <button
            onClick={() => handleToggle('platform', 'debugMode')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.platform.debugMode ? 'bg-brand' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.platform.debugMode ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
          <input
            type="number"
            step="0.1"
            value={settings.payments.commissionRate}
            onChange={(e) => handleInputChange('payments', 'commissionRate', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Minimum (₦)</label>
          <input
            type="number"
            value={settings.payments.withdrawalMinimum}
            onChange={(e) => handleInputChange('payments', 'withdrawalMinimum', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Fee (₦)</label>
          <input
            type="number"
            value={settings.payments.withdrawalFee}
            onChange={(e) => handleInputChange('payments', 'withdrawalFee', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
      </div>

      {/* Paystack Configuration */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Paystack Integration</h4>
              <p className="text-sm text-gray-500">Primary payment processor for Nigeria</p>
            </div>
          </div>
          <button
            onClick={() => handleNestedChange('payments', 'paystack', 'enabled', !settings.payments.paystack.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.payments.paystack.enabled ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.payments.paystack.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        {settings.payments.paystack.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
              <div className="relative">
                <input
                  type={(showSecrets as any)['paystack-public'] ? 'text' : 'password'}
                  value={settings.payments.paystack.publicKey}
                  onChange={(e) => handleNestedChange('payments', 'paystack', 'publicKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => toggleSecretVisibility('paystack-public')}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {(showSecrets as any)['paystack-public'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
              <div className="relative">
                <input
                  type={(showSecrets as any)['paystack-secret'] ? 'text' : 'password'}
                  value={settings.payments.paystack.secretKey}
                  onChange={(e) => handleNestedChange('payments', 'paystack', 'secretKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => toggleSecretVisibility('paystack-secret')}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {(showSecrets as any)['paystack-secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(settings.notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="text-sm font-medium text-gray-900 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h4>
              <p className="text-xs text-gray-500">
                {key.includes('email') ? 'Email notifications' :
                 key.includes('sms') ? 'SMS notifications' :
                 key.includes('push') ? 'Push notifications' :
                 key.includes('admin') ? 'Admin alerts' :
                 key.includes('customer') ? 'Customer alerts' :
                 key.includes('order') ? 'Order updates' :
                 key.includes('payment') ? 'Payment updates' :
                 'System notifications'}
              </p>
            </div>
            <button
              onClick={() => handleToggle('notifications', key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Key Rotation (days)</label>
          <input
            type="number"
            value={settings.security.apiKeyRotation}
            onChange={(e) => handleInputChange('security', 'apiKeyRotation', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-xs text-gray-500">Require 2FA for admin access</p>
          </div>
          <button
            onClick={() => handleToggle('security', 'twoFactorAuth')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.security.twoFactorAuth ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.security.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Encryption Enabled</h4>
            <p className="text-xs text-gray-500">Encrypt sensitive data</p>
          </div>
          <button
            onClick={() => handleToggle('security', 'encryptionEnabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.security.encryptionEnabled ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.security.encryptionEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Audit Logging</h4>
            <p className="text-xs text-gray-500">Log all admin actions</p>
          </div>
          <button
            onClick={() => handleToggle('security', 'auditLogging')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.security.auditLogging ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.security.auditLogging ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "platform":
        return renderPlatformSettings();
      case "payments":
        return renderPaymentSettings();
      case "notifications":
        return renderNotificationSettings();
      case "security":
        return renderSecuritySettings();
      case "integrations":
        return (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Third-party Integrations</h3>
            <p className="text-gray-600">Configure shipping, analytics, and social media integrations</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
          </div>
        );
      case "performance":
        return (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance & Cache Settings</h3>
            <p className="text-gray-600">Configure caching, CDN, and performance optimizations</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* System Settings Header */}
        <Section>
          <SectionHeader 
            title="System Settings" 
            description="Configure platform settings, integrations, and security"
          >
            <div className="flex space-x-3">
              {hasChanges && (
                <Button
                  onClick={() => console.log("Save changes")}
                  className="mt-0 w-auto px-6 h-11"
                  disabled
                  title="Not available yet"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
              <Button
                onClick={() => console.log("Reset")}
                variant="bordered"
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </SectionHeader>
        </Section>

        {/* Read-only notice — settings are not yet connected to a backend */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-800">
            Settings are read-only — not yet connected to the backend.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.key
                      ? "bg-brand text-white shadow-soft"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  {(() => {
                    const activeTabData = tabs.find(tab => tab.key === activeTab);
                    const IconComponent = activeTabData?.icon;
                    return IconComponent ? (
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {tabs.find(tab => tab.key === activeTab)?.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure {tabs.find(tab => tab.key === activeTab)?.label.toLowerCase()} for the platform
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {renderContent()}
              </CardContent>

              {hasChanges && (
                <CardFooter>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center text-amber-600">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span className="text-sm">You have unsaved changes</span>
                    </div>
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => {setHasChanges(false); setSettings(systemSettings);}}
                        variant="bordered"
                        className="mt-0 w-auto px-4 h-10 text-sm"
                      >
                        Discard Changes
                      </Button>
                      <Button
                        onClick={() => console.log("Save changes")}
                        className="mt-0 w-auto px-6 h-11"
                        disabled
                        title="Not available yet"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}