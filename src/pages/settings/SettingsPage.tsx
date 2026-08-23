import { useEffect } from 'react';
import { Card, Form, Input, Button, Select, Tabs, message, Space, Switch, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/services/settings.service';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import type { HostelSettings } from '@/types/models';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { updatePassword } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [hostelForm] = Form.useForm();
  const [pwForm] = Form.useForm();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  useEffect(() => {
    if (settings) hostelForm.setFieldsValue(settings);
  }, [settings, hostelForm]);

  const saveMut = useMutation({
    mutationFn: (v: Partial<HostelSettings>) => updateSettings(v),
    onSuccess: () => {
      message.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: (v: { password: string }) => updatePassword(v.password),
    onSuccess: () => {
      message.success('Password changed');
      pwForm.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Title level={3} style={{ margin: 0 }}>
        Settings
      </Title>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'hostel',
            label: 'Hostel Info',
            children: (
              <Card>
                <Form form={hostelForm} layout="vertical" onFinish={(v) => saveMut.mutate(v)} style={{ maxWidth: 560 }}>
                  <Form.Item name="hostel_name" label="Hostel Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="address" label="Address">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Space style={{ display: 'flex' }} align="baseline">
                    <Form.Item name="phone" label="Phone">
                      <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                      <Input />
                    </Form.Item>
                  </Space>
                  <Form.Item name="receipt_footer" label="Receipt Footer">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Space style={{ display: 'flex' }} align="baseline">
                    <Form.Item name="currency" label="Currency">
                      <Select
                        style={{ width: 140 }}
                        options={['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'].map((c) => ({ label: c, value: c }))}
                      />
                    </Form.Item>
                    <Form.Item name="date_format" label="Date Format">
                      <Select
                        style={{ width: 180 }}
                        options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((c) => ({ label: c, value: c }))}
                      />
                    </Form.Item>
                  </Space>
                  <Button type="primary" htmlType="submit" loading={saveMut.isPending}>
                    Save
                  </Button>
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Currency & date format apply after reload.
                  </Text>
                </Form>
              </Card>
            ),
          },
          {
            key: 'appearance',
            label: 'Appearance',
            children: (
              <Card>
                <Space align="center">
                  <span>Dark mode</span>
                  <Switch checked={mode === 'dark'} onChange={(c) => setMode(c ? 'dark' : 'light')} />
                </Space>
              </Card>
            ),
          },
          {
            key: 'security',
            label: 'Security',
            children: (
              <Card>
                <Form form={pwForm} layout="vertical" onFinish={(v) => pwMut.mutate(v)} style={{ maxWidth: 420 }}>
                  <Form.Item
                    name="password"
                    label="New Password"
                    rules={[{ required: true }, { min: 8, message: 'At least 8 characters' }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    name="confirm"
                    label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={pwMut.isPending}>
                    Change Password
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'backup',
            label: 'Google Drive Backup',
            children: (
              <Card>
                <Form
                  layout="vertical"
                  initialValues={{ drive_folder_id: settings?.drive_folder_id }}
                  onFinish={(v) => saveMut.mutate(v)}
                  style={{ maxWidth: 560 }}
                >
                  <Text type="secondary">
                    Provide the Google Drive folder ID where receipts &amp; reports are backed up.
                    Connection is completed via the Supabase Edge Function (see README).
                  </Text>
                  <Form.Item name="drive_folder_id" label="Drive Folder ID" style={{ marginTop: 16 }}>
                    <Input placeholder="1A2b3C..." />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saveMut.isPending}>
                    Save Drive Settings
                  </Button>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
