import { useState } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadFile } from '@/services/storage.service';

interface Props {
  bucket: string;
  prefix?: string;
  value?: string | null;
  onChange?: (path: string | null) => void;
  label?: string;
  accept?: string;
}

/**
 * Uploads a single file to a Supabase Storage bucket and reports back the
 * stored path via `onChange`. Designed to plug into AntD Form.Item.
 */
export default function FileUpload({ bucket, prefix, value, onChange, label = 'Upload', accept }: Props) {
  const [loading, setLoading] = useState(false);

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    try {
      const path = await uploadFile(bucket, file as File, prefix);
      onChange?.(path);
      onSuccess?.(path);
      message.success('File uploaded');
    } catch (err) {
      onError?.(err as Error);
      message.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Upload
      customRequest={customRequest}
      maxCount={1}
      accept={accept}
      showUploadList={false}
    >
      <Button icon={<UploadOutlined />} loading={loading}>
        {value ? 'Replace file' : label}
      </Button>
      {value && <span style={{ marginLeft: 8, color: '#3f8600' }}>✓ attached</span>}
    </Upload>
  );
}
