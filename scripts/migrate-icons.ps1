param(
    [string]$srcDir = "C:\Users\HP\Documents\Code\Incident\frontend\src"
)

$mapping = @{
    "IconAlertCircle" = "AlertCircle"
    "IconAlertTriangle" = "TriangleAlert"
    "IconAmbulance" = "Ambulance"
    "IconArrowRight" = "ArrowRight"
    "IconBell" = "Bell"
    "IconBrain" = "Brain"
    "IconBuilding" = "Building2"
    "IconBulb" = "Lightbulb"
    "IconCalendar" = "Calendar"
    "IconCamera" = "Camera"
    "IconCameraOff" = "CameraOff"
    "IconCar" = "Car"
    "IconChartBar" = "BarChart3"
    "IconCheck" = "Check"
    "IconChecks" = "CheckCheck"
    "IconChevronDown" = "ChevronDown"
    "IconChevronRight" = "ChevronRight"
    "IconChevronUp" = "ChevronUp"
    "IconClock" = "Clock"
    "IconCopy" = "Copy"
    "IconDashboard" = "LayoutDashboard"
    "IconDeviceFloppy" = "Save"
    "IconDotsVertical" = "MoreVertical"
    "IconDownload" = "Download"
    "IconDroplet" = "Droplets"
    "IconEdit" = "Pencil"
    "IconEye" = "Eye"
    "IconFileReport" = "FileText"
    "IconFileText" = "FileText"
    "IconFileTypePdf" = "FileType2"
    "IconFileTypeXls" = "FileSpreadsheet"
    "IconFilter" = "Filter"
    "IconFlame" = "Flame"
    "IconInfoCircle" = "Info"
    "IconList" = "List"
    "IconListDetails" = "ListChecks"
    "IconLogin" = "LogIn"
    "IconLogout" = "LogOut"
    "IconMail" = "Mail"
    "IconMailOpened" = "MailOpen"
    "IconMap" = "Map"
    "IconMapPin" = "MapPin"
    "IconMapSearch" = "Search"
    "IconMaximize" = "Maximize"
    "IconMist" = "CloudFog"
    "IconPackage" = "Package"
    "IconPhone" = "Phone"
    "IconPhoneCall" = "PhoneCall"
    "IconPhoto" = "Image"
    "IconPlus" = "Plus"
    "IconRefresh" = "RefreshCcw"
    "IconSearch" = "Search"
    "IconSettings" = "Settings"
    "IconShield" = "Shield"
    "IconSortAscending" = "ArrowUpDown"
    "IconTableExport" = "Table2"
    "IconTrash" = "Trash2"
    "IconTrendingUp" = "TrendingUp"
    "IconUser" = "User"
    "IconUsers" = "Users"
    "IconVideo" = "Video"
    "IconX" = "X"
}

$files = Get-ChildItem -Path $srcDir -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notmatch "\\node_modules\\" }

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $original = $content

    # Replace import source
    $content = $content -replace "from '@tabler/icons-react'", "from 'lucide-react'"

    # Replace each icon name
    foreach ($tabler in $mapping.Keys) {
        $lucide = $mapping[$tabler]
        $content = $content -replace "\b$tabler\b", $lucide
    }

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "Migration complete." -ForegroundColor Cyan
