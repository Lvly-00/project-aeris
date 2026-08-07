import { useState } from 'react';
import {
  Card,
  Text,
  Group,
  Title,
  Button,
  Select,
  Stack,
  SimpleGrid,
  Paper,
  Box,
  Badge,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  FileText,
  Download,
  Table2,
  Plus,
  Calendar,
  FileType2,
  FileSpreadsheet,
} from 'lucide-react';
import { reportsAPI } from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/helpers';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [reportType, setReportType] = useState<string | null>('Daily');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [title, setTitle] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await reportsAPI.list();
      return res.data.results || res.data;
    },
    refetchInterval: 30000,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => reportsAPI.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      notifications.show({ title: 'Success', message: 'Report generated successfully', color: 'green' });
      setGenerateModalOpen(false);
      setTitle('');
      setDateRange([null, null]);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to generate report',
        color: 'red',
      });
    },
  });

  const handleGenerate = () => {
    if (!dateRange[0] || !dateRange[1]) {
      notifications.show({ title: 'Error', message: 'Please select date range', color: 'red' });
      return;
    }
    generateMutation.mutate({
      title: title || `${reportType} Report`,
      report_type: reportType,
      date_range_start: dateRange[0].toISOString(),
      date_range_end: dateRange[1].toISOString(),
    });
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const res = await reportsAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to download PDF', color: 'red' });
    }
  };

  const handleDownloadExcel = async (id: number) => {
    try {
      const res = await reportsAPI.downloadExcel(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to download Excel', color: 'red' });
    }
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={3}>Reports</Title>
        {/* <Button
          leftSection={<Plus size={16} />}
          onClick={() => setGenerateModalOpen(true)}
        >
          Generate Report
        </Button> */}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {Array.isArray(reports) && reports.length > 0 ? (
          reports.map((report: any) => (
            <Card key={report.id} withBorder padding="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Badge
                  color={report.report_type === 'Daily' ? 'blue' : report.report_type === 'Weekly' ? 'grape' : 'teal'}
                  variant="light"
                  size="sm"
                >
                  {report.report_type}
                </Badge>
              </Group>
              <Text fw={600} size="sm" mb="xs" lineClamp={2}>
                {report.title}
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                {formatDate(report.date_range_start)} - {formatDate(report.date_range_end)}
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Generated {formatRelativeTime(report.created_at)}
              </Text>
              <Group gap="xs">
                <Tooltip label="Download PDF">
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleDownloadPdf(report.id)}
                  >
                    <FileType2 size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Download Excel">
                  <ActionIcon
                    variant="light"
                    color="green"
                    onClick={() => handleDownloadExcel(report.id)}
                  >
                    <FileSpreadsheet size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Card>
          ))
        ) : (
          <Paper p="xl" ta="center" withBorder style={{ gridColumn: '1 / -1' }}>
            <FileText size={48} color="#444" />
            <Text mt="md" size="lg" fw={500}>
              No Reports Generated
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Generate your first report to get started
            </Text>
            <Button
              leftSection={<Plus size={16} />}
              onClick={() => setGenerateModalOpen(true)}
            >
              Generate Report
            </Button>
          </Paper>
        )}
      </SimpleGrid>

      <Modal
        opened={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Report"
        size="md"
      >
        <Stack>
          <TextInput
            label="Report Title"
            placeholder="Enter report title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
          <Select
            label="Report Type"
            data={[
              { value: 'Daily', label: 'Daily Report' },
              { value: 'Weekly', label: 'Weekly Report' },
              { value: 'Monthly', label: 'Monthly Report' },
            ]}
            value={reportType}
            onChange={setReportType}
          />
          <DatePickerInput
            type="range"
            label="Date Range"
            placeholder="Select date range"
            value={dateRange}
            onChange={setDateRange}
            clearable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generateMutation.isPending}
              leftSection={<FileText size={16} />}
            >
              Generate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
