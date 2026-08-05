import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Activity
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account/notifications")({
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  const t = useT();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    emailReminders: true,
    pushReminders: true,
    orderUpdates: true,
    deliveryStatus: true,
  });

  const handleSave = () => {
    toast.success(t("সেটিংস সেভ করা হয়েছে।", "Settings saved successfully."));
  };

  const deliveryLogs = [
    { id: 1, type: 'Email', target: 'user@example.com', status: 'Sent', time: '2026-08-05 10:00' },
    { id: 2, type: 'Push', target: 'iPhone 15', status: 'Delivered', time: '2026-08-05 09:30' },
    { id: 3, type: 'Email', target: 'user@example.com', status: 'Failed', time: '2026-08-04 22:15' },
  ];

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/account">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            {t("নোটিফিকেশন সেটিংস", "Notification Settings")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("রিমাইন্ডার এবং গুরুত্বপূর্ণ নোটিফিকেশন পাওয়ার মাধ্যম বেছে নিন।", "Choose how you want to receive reminders and important notifications.")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("ইমেইল নোটিফিকেশন", "Email Notifications")}
            </CardTitle>
            <CardDescription>
              {t("আপনার নিবন্ধিত ইমেইলে রিমাইন্ডার এবং তথ্য পাঠানো হবে।", "Reminders and info will be sent to your registered email.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-reminders" className="flex-1 cursor-pointer">
                {t("মেডিসিন রিমাইন্ডার", "Medicine Reminders")}
              </Label>
              <Switch 
                id="email-reminders" 
                checked={settings.emailReminders} 
                onCheckedChange={(v) => setSettings(s => ({...s, emailReminders: v}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-orders" className="flex-1 cursor-pointer">
                {t("অর্ডার আপডেট", "Order Updates")}
              </Label>
              <Switch 
                id="email-orders" 
                checked={settings.orderUpdates} 
                onCheckedChange={(v) => setSettings(s => ({...s, orderUpdates: v}))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t("পুশ নোটিফিকেশন", "Push Notifications")}
            </CardTitle>
            <CardDescription>
              {t("আপনার ব্রাউজার বা অ্যাপে সরাসরি নোটিফিকেশন পাঠানো হবে।", "Direct notifications to your browser or app.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-reminders" className="flex-1 cursor-pointer">
                {t("মেডিসিন রিমাইন্ডার", "Medicine Reminders")}
              </Label>
              <Switch 
                id="push-reminders" 
                checked={settings.pushReminders} 
                onCheckedChange={(v) => setSettings(s => ({...s, pushReminders: v}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-delivery" className="flex-1 cursor-pointer">
                {t("ডেলিভারি স্ট্যাটাস", "Delivery Status")}
              </Label>
              <Switch 
                id="push-delivery" 
                checked={settings.deliveryStatus} 
                onCheckedChange={(v) => setSettings(s => ({...s, deliveryStatus: v}))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {t("পরিবর্তনগুলো সেভ করুন", "Save Changes")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("ডেলিভারি স্ট্যাটাস হিস্ট্রি", "Delivery Status History")}
            </CardTitle>
            <CardDescription>
              {t("সম্প্রতি পাঠানো নোটিফিকেশনগুলোর ডেলিভারি স্ট্যাটাস দেখুন।", "Check the delivery status of recently sent notifications.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveryLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {log.type === 'Email' ? <Mail className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                      {log.target}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{log.time}</p>
                  </div>
                  <Badge variant={log.status === 'Sent' || log.status === 'Delivered' ? 'secondary' : 'destructive'} className="text-[10px] h-5">
                    {log.status === 'Sent' || log.status === 'Delivered' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
