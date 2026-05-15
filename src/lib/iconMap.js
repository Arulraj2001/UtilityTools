import {
  Calculator, Type, Code, Code2, DollarSign, GraduationCap, FileText, Image,
  Heart, Globe, Globe2, Lock, Palette, BarChart2, BarChart3, TrendingUp,
  Wrench, Clock, Zap, Ruler, Thermometer, Hash, Binary, Braces, Fingerprint,
  AlignLeft, ArrowLeftRight, ArrowUpDown, Layers, Link, Receipt, Percent,
  Tag, Utensils, Activity, Calendar, IndianRupee, Fuel, Shield, Shuffle,
  FileImage, FilePlus, Scissors, Merge, SplitSquareHorizontal,
  Download, Upload, RefreshCw, Cpu, Database, Terminal, Key,
  FileDown, FileUp, PackageOpen,

  // Gov exam icons
  User, PenLine, Train, Landmark, Camera, TrendingDown, Pencil, Crop,
  FileBadge, Combine, Images, ScanLine,

  // Image tools
  Minimize2, Expand, RotateCw, Stamp, Pipette, Info, Eraser,

  // PDF tools
  FileCheck, ImageIcon,

  // New icons
  Youtube,
} from 'lucide-react';

export const ICON_MAP = {
  Calculator, Type, Code, Code2, DollarSign, GraduationCap, FileText, Image,
  Heart, Globe, Globe2, Lock, Palette, BarChart2, BarChart3, TrendingUp,
  Wrench, Clock, Zap, Ruler, Thermometer, Hash, Binary, Braces, Fingerprint,
  AlignLeft, ArrowLeftRight, ArrowUpDown, Layers, Link, Receipt, Percent,
  Tag, Utensils, Activity, Calendar, IndianRupee, Fuel, Shield, Shuffle,
  FileImage, FilePlus, Scissors, Merge, SplitSquareHorizontal,
  Download, Upload, RefreshCw, Cpu, Database, Terminal, Key,
  FileDown, FileUp, PackageOpen,

  // Gov exam icons
  User, PenLine, Train, Landmark, Camera, TrendingDown, Pencil, Crop,
  FileBadge, Combine, Images, ScanLine,

  // Image tools
  Minimize2, Expand, RotateCw, Stamp, Pipette, Info, Eraser,

  // PDF tools
  FileCheck, ImageIcon,

  // New icons
  Youtube,
};

export function getIcon(name) {
  return ICON_MAP[name] || Wrench;
}