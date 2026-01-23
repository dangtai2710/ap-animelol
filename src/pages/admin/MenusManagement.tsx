import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Save, Trash2, GripVertical, ChevronRight, ChevronDown, ExternalLink, Menu, Edit2, Search, Folder, Film, Globe, Calendar, Tag, Tv, FileText, Link, Home, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuPreview } from "@/components/admin/MenuPreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MenuType {
  id: string;
  name: string;
  slug: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  title: string;
  url: string | null;
  link_type: string;
  link_target: string;
  icon: string | null;
  css_class: string | null;
  display_order: number;
  is_active: boolean;
  children?: MenuItem[];
}

interface SelectableItem {
  id: string;
  name: string;
  slug: string;
  url: string;
}

const LOCATIONS = [
  { value: "header", label: "Header (Menu chính)" },
  { value: "mobile", label: "Menu Mobile" },
  { value: "footer", label: "Footer" },
];

const STATIC_PAGES = [
  { id: "home", name: "Trang chủ", slug: "/", url: "/" },
  { id: "movies", name: "Phim mới", slug: "/phim-moi", url: "/phim-moi" },
  { id: "phim-bo", name: "Phim Bộ", slug: "/danh-sach/phim-bo", url: "/danh-sach/phim-bo" },
  { id: "phim-le", name: "Phim Lẻ", slug: "/danh-sach/phim-le", url: "/danh-sach/phim-le" },
  { id: "hoat-hinh", name: "Hoạt Hình", slug: "/danh-sach/hoat-hinh", url: "/danh-sach/hoat-hinh" },
  { id: "tv-shows", name: "TV Shows", slug: "/danh-sach/tv-shows", url: "/danh-sach/tv-shows" },
  { id: "tv", name: "Xem TV", slug: "/tv", url: "/tv" },
  { id: "search", name: "Tìm kiếm", slug: "/tim-kiem", url: "/tim-kiem" },
];

// Sortable Menu Item Component
function SortableMenuItem({ 
  item, 
  depth = 0,
  expandedItems,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
}: {
  item: MenuItem;
  depth?: number;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 24}px`,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors mb-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
        
        {hasChildren ? (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 flex-shrink-0"
            onClick={() => onToggleExpand(item.id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-6 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.title}</span>
            {hasChildren && (
              <Badge variant="outline" className="text-xs">
                {item.children!.length} mục con
              </Badge>
            )}
            {item.link_target === "_blank" && (
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{item.url || "Menu cha"}</p>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddChild(item.id)} title="Thêm menu con">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <SortableContext items={item.children!.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {item.children!.map(child => (
            <SortableMenuItem
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

export default function MenusManagement() {
  const queryClient = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuSlug, setNewMenuSlug] = useState("");
  const [newMenuLocation, setNewMenuLocation] = useState("header");
  const [showNewMenuDialog, setShowNewMenuDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewTab, setPreviewTab] = useState<"structure" | "preview">("structure");
  
  // Item form state
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemLinkTarget, setItemLinkTarget] = useState("_self");
  const [itemIcon, setItemIcon] = useState("");
  const [itemCssClass, setItemCssClass] = useState("");
  const [itemParentId, setItemParentId] = useState<string | null>(null);

  // Selection state for batch adding
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectableItem>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch menus
  const { data: menus, isLoading: menusLoading } = useQuery({
    queryKey: ["admin-menus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MenuType[];
    },
  });

  // Fetch menu items for selected menu
  const { data: menuItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["admin-menu-items", selectedMenu],
    queryFn: async () => {
      if (!selectedMenu) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_id", selectedMenu)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!selectedMenu,
  });

  // Fetch genres
  const { data: genres } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data.map(g => ({ ...g, url: `/the-loai/${g.slug}` })) as SelectableItem[];
    },
  });

  // Fetch countries
  const { data: countries } = useQuery({
    queryKey: ["admin-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data.map(c => ({ ...c, url: `/quoc-gia/${c.slug}` })) as SelectableItem[];
    },
  });

  // Fetch years
  const { data: years } = useQuery({
    queryKey: ["admin-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("years")
        .select("id, year")
        .is("deleted_at", null)
        .order("year", { ascending: false });
      if (error) throw error;
      return data.map(y => ({ 
        id: y.id, 
        name: y.year.toString(), 
        slug: y.year.toString(),
        url: `/nam/${y.year}` 
      })) as SelectableItem[];
    },
  });

  // Fetch movie categories
  const { data: movieCategories } = useQuery({
    queryKey: ["admin-movie-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_categories")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data.map(c => ({ ...c, url: `/danh-muc/${c.slug}` })) as SelectableItem[];
    },
  });

  // Fetch TV channel categories
  const { data: tvCategories } = useQuery({
    queryKey: ["admin-tv-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_channel_categories")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data.map(c => ({ ...c, url: `/tv/danh-muc/${c.slug}` })) as SelectableItem[];
    },
  });

  // Fetch post categories
  const { data: postCategories } = useQuery({
    queryKey: ["admin-post-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_categories")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data.map(c => ({ ...c, url: `/tin-tuc/${c.slug}` })) as SelectableItem[];
    },
  });

  // Organize items into tree structure
  const organizeMenuItems = useCallback((items: MenuItem[]): MenuItem[] => {
    const itemMap = new Map<string, MenuItem>();
    const rootItems: MenuItem[] = [];

    items?.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    items?.forEach(item => {
      const currentItem = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id)!.children!.push(currentItem);
      } else {
        rootItems.push(currentItem);
      }
    });

    // Sort by display_order
    const sortItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .sort((a, b) => a.display_order - b.display_order)
        .map(item => ({
          ...item,
          children: item.children ? sortItems(item.children) : []
        }));
    };

    return sortItems(rootItems);
  }, []);

  const organizedItems = menuItems ? organizeMenuItems(menuItems) : [];

  // Get all item IDs for sortable context
  const getAllItemIds = useCallback((items: MenuItem[]): string[] => {
    const ids: string[] = [];
    items.forEach(item => {
      ids.push(item.id);
      if (item.children) {
        ids.push(...getAllItemIds(item.children));
      }
    });
    return ids;
  }, []);

  // Create menu mutation
  const createMenuMutation = useMutation({
    mutationFn: async () => {
      const slug = newMenuSlug || newMenuName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const { error } = await supabase
        .from("menus")
        .insert({ name: newMenuName, slug, location: newMenuLocation });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      setShowNewMenuDialog(false);
      setNewMenuName("");
      setNewMenuSlug("");
      toast.success("Đã tạo menu mới");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: string) => {
      const { error } = await supabase.from("menus").delete().eq("id", menuId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      if (selectedMenu) setSelectedMenu(null);
      toast.success("Đã xóa menu");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Create/Update menu item mutation
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMenu) throw new Error("Chưa chọn menu");
      
      const itemData = {
        menu_id: selectedMenu,
        title: itemTitle,
        url: itemUrl || null,
        link_type: "custom",
        link_target: itemLinkTarget,
        icon: itemIcon || null,
        css_class: itemCssClass || null,
        parent_id: itemParentId,
        display_order: menuItems?.length || 0,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(itemData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items", selectedMenu] });
      queryClient.invalidateQueries({ queryKey: ["menu-by-location"] });
      resetItemForm();
      setShowItemDialog(false);
      toast.success(editingItem ? "Đã cập nhật mục menu" : "Đã thêm mục menu");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Batch add items mutation
  const batchAddMutation = useMutation({
    mutationFn: async (items: SelectableItem[]) => {
      if (!selectedMenu) throw new Error("Chưa chọn menu");
      
      const currentCount = menuItems?.length || 0;
      const itemsToInsert = items.map((item, index) => ({
        menu_id: selectedMenu,
        title: item.name,
        url: item.url,
        link_type: "custom",
        link_target: "_self",
        display_order: currentCount + index,
      }));

      const { error } = await supabase.from("menu_items").insert(itemsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items", selectedMenu] });
      queryClient.invalidateQueries({ queryKey: ["menu-by-location"] });
      setSelectedItems(new Map());
      toast.success("Đã thêm các mục vào menu");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number; parent_id: string | null }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("menu_items")
          .update({ display_order: update.display_order, parent_id: update.parent_id })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items", selectedMenu] });
      queryClient.invalidateQueries({ queryKey: ["menu-by-location"] });
    },
    onError: (error: any) => {
      toast.error("Lỗi khi cập nhật thứ tự: " + error.message);
    },
  });

  // Delete menu item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items", selectedMenu] });
      queryClient.invalidateQueries({ queryKey: ["menu-by-location"] });
      toast.success("Đã xóa mục menu");
    },
    onError: (error: any) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const resetItemForm = () => {
    setItemTitle("");
    setItemUrl("");
    setItemLinkTarget("_self");
    setItemIcon("");
    setItemCssClass("");
    setItemParentId(null);
    setEditingItem(null);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemUrl(item.url || "");
    setItemLinkTarget(item.link_target);
    setItemIcon(item.icon || "");
    setItemCssClass(item.css_class || "");
    setItemParentId(item.parent_id);
    setShowItemDialog(true);
  };

  const openNewItem = (parentId?: string) => {
    resetItemForm();
    if (parentId) setItemParentId(parentId);
    setShowItemDialog(true);
  };

  const toggleItemSelection = (item: SelectableItem, category: string) => {
    const key = `${category}-${item.id}`;
    const newSelected = new Map(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, item);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelectedItems = () => {
    if (selectedItems.size === 0) {
      toast.error("Chưa chọn mục nào");
      return;
    }
    batchAddMutation.mutate(Array.from(selectedItems.values()));
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const filterItems = (items: SelectableItem[] | undefined) => {
    if (!items) return [];
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id || !menuItems) return;

    const oldIndex = menuItems.findIndex(item => item.id === active.id);
    const newIndex = menuItems.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(menuItems, oldIndex, newIndex);
    const updates = newItems.map((item, index) => ({
      id: item.id,
      display_order: index,
      parent_id: item.parent_id,
    }));

    updateOrderMutation.mutate(updates);
  };

  // Render selectable items list
  const renderSelectableItems = (
    items: SelectableItem[] | undefined, 
    category: string, 
    icon: React.ReactNode,
    title: string
  ) => {
    const filteredItems = filterItems(items);
    if (!filteredItems.length) return null;

    return (
      <AccordionItem value={category}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
            <Badge variant="secondary" className="ml-2">{filteredItems.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1 pr-4">
              {filteredItems.map(item => {
                const key = `${category}-${item.id}`;
                const isSelected = selectedItems.has(key);
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleItemSelection(item, category)}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </AccordionContent>
      </AccordionItem>
    );
  };

  // Auto expand all items initially
  useEffect(() => {
    if (menuItems) {
      const allIds = new Set(menuItems.filter(i => menuItems.some(c => c.parent_id === i.id)).map(i => i.id));
      setExpandedItems(allIds);
    }
  }, [menuItems]);

  const handleDeleteItem = (itemId: string) => {
    const item = menuItems?.find(i => i.id === itemId);
    const hasChildren = menuItems?.some(i => i.parent_id === itemId);
    if (confirm(`Xóa "${item?.title}"${hasChildren ? ' và tất cả menu con?' : '?'}`)) {
      deleteItemMutation.mutate(itemId);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <SidebarTrigger />
            <div>
              <h1 className="text-xl font-semibold">Quản lý Menu</h1>
              <p className="text-sm text-muted-foreground">Kéo thả để sắp xếp, tạo menu con như WordPress</p>
            </div>
          </header>

          <main className="p-6">
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Panel - Add Items */}
              <div className="lg:col-span-4 space-y-4">
                {/* Menu List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">Danh sách Menu</CardTitle>
                      <CardDescription>Chọn menu để chỉnh sửa</CardDescription>
                    </div>
                    <Dialog open={showNewMenuDialog} onOpenChange={setShowNewMenuDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Thêm
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tạo Menu Mới</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Tên Menu</Label>
                            <Input 
                              value={newMenuName} 
                              onChange={(e) => setNewMenuName(e.target.value)}
                              placeholder="VD: Menu Header"
                            />
                          </div>
                          <div>
                            <Label>Slug</Label>
                            <Input 
                              value={newMenuSlug} 
                              onChange={(e) => setNewMenuSlug(e.target.value)}
                              placeholder="VD: header (để trống sẽ tự tạo)"
                            />
                          </div>
                          <div>
                            <Label>Vị trí hiển thị</Label>
                            <Select value={newMenuLocation} onValueChange={setNewMenuLocation}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LOCATIONS.map(loc => (
                                  <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={() => createMenuMutation.mutate()} 
                            disabled={!newMenuName || createMenuMutation.isPending}
                            className="w-full"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Tạo Menu
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {menusLoading ? (
                        <p className="text-sm text-muted-foreground">Đang tải...</p>
                      ) : menus?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Chưa có menu nào</p>
                      ) : (
                        menus?.map(menu => (
                          <div
                            key={menu.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedMenu === menu.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedMenu(menu.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Menu className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{menu.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {LOCATIONS.find(l => l.value === menu.location)?.label || menu.location}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Add Items Panel */}
                {selectedMenu && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Thêm mục menu</CardTitle>
                      <CardDescription>Chọn từ danh sách hoặc thêm link tùy chỉnh</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Tìm kiếm..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {/* Selectable Items Accordion */}
                      <ScrollArea className="h-[400px]">
                        <Accordion type="multiple" className="w-full">
                          {/* Custom Link */}
                          <AccordionItem value="custom">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                <span>Link tùy chỉnh</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 p-1">
                                <div>
                                  <Label className="text-xs">URL</Label>
                                  <Input 
                                    placeholder="https:// hoặc /"
                                    value={itemUrl}
                                    onChange={(e) => setItemUrl(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Tiêu đề</Label>
                                  <Input 
                                    placeholder="Tiêu đề menu"
                                    value={itemTitle}
                                    onChange={(e) => setItemTitle(e.target.value)}
                                  />
                                </div>
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  disabled={!itemTitle || saveItemMutation.isPending}
                                  onClick={() => saveItemMutation.mutate()}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Thêm vào Menu
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* Static Pages */}
                          {renderSelectableItems(STATIC_PAGES, "pages", <Home className="h-4 w-4" />, "Trang tĩnh")}

                          {/* Genres */}
                          {renderSelectableItems(genres, "genres", <Tag className="h-4 w-4" />, "Thể loại")}

                          {/* Countries */}
                          {renderSelectableItems(countries, "countries", <Globe className="h-4 w-4" />, "Quốc gia")}

                          {/* Years */}
                          {renderSelectableItems(years, "years", <Calendar className="h-4 w-4" />, "Năm phát hành")}

                          {/* Movie Categories */}
                          {renderSelectableItems(movieCategories, "movie-categories", <Film className="h-4 w-4" />, "Danh mục phim")}

                          {/* TV Categories */}
                          {renderSelectableItems(tvCategories, "tv-categories", <Tv className="h-4 w-4" />, "Danh mục TV")}

                          {/* Post Categories */}
                          {renderSelectableItems(postCategories, "post-categories", <FileText className="h-4 w-4" />, "Danh mục bài viết")}
                        </Accordion>
                      </ScrollArea>

                      {/* Add Selected Button */}
                      {selectedItems.size > 0 && (
                        <Button 
                          className="w-full" 
                          onClick={handleAddSelectedItems}
                          disabled={batchAddMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Thêm {selectedItems.size} mục đã chọn
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Panel - Menu Structure with Drag & Drop + Preview */}
              <div className="lg:col-span-8">
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedMenu 
                          ? `${menus?.find(m => m.id === selectedMenu)?.name}`
                          : "Chọn menu để chỉnh sửa"
                        }
                      </CardTitle>
                      <CardDescription>
                        Kéo thả để sắp xếp thứ tự menu
                      </CardDescription>
                    </div>
                    {selectedMenu && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openNewItem()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Thêm mục
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa menu này và tất cả mục menu?")) {
                              deleteMenuMutation.mutate(selectedMenu);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa Menu
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedMenu ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Chọn một menu từ danh sách bên trái để chỉnh sửa</p>
                      </div>
                    ) : itemsLoading ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">Đang tải...</p>
                      </div>
                    ) : (
                      <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "structure" | "preview")}>
                        <TabsList className="mb-4">
                          <TabsTrigger value="structure" className="gap-2">
                            <Menu className="h-4 w-4" />
                            Cấu trúc
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Xem trước
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="structure">
                          {organizedItems.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="mb-4">Menu này chưa có mục nào</p>
                              <p className="text-sm mb-4">Chọn mục từ panel bên trái hoặc thêm link tùy chỉnh</p>
                              <Button onClick={() => openNewItem()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Thêm mục đầu tiên
                              </Button>
                            </div>
                          ) : (
                            <ScrollArea className="h-[450px]">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                              >
                                <SortableContext items={getAllItemIds(organizedItems)} strategy={verticalListSortingStrategy}>
                                  <div className="pr-4">
                                    {organizedItems.map(item => (
                                      <SortableMenuItem
                                        key={item.id}
                                        item={item}
                                        expandedItems={expandedItems}
                                        onToggleExpand={toggleExpand}
                                        onEdit={openEditItem}
                                        onDelete={handleDeleteItem}
                                        onAddChild={openNewItem}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                                <DragOverlay>
                                  {activeId ? (
                                    <div className="p-3 rounded-lg border bg-card shadow-lg">
                                      <span className="font-medium">
                                        {menuItems?.find(i => i.id === activeId)?.title}
                                      </span>
                                    </div>
                                  ) : null}
                                </DragOverlay>
                              </DndContext>
                            </ScrollArea>
                          )}
                        </TabsContent>

                        <TabsContent value="preview">
                          <div className="border rounded-lg p-4 bg-muted/30 min-h-[450px]">
                            <MenuPreview 
                              items={organizedItems}
                              location={menus?.find(m => m.id === selectedMenu)?.location || "header"}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Edit Item Dialog */}
            <Dialog open={showItemDialog} onOpenChange={(open) => {
              setShowItemDialog(open);
              if (!open) resetItemForm();
            }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Chỉnh sửa mục menu" : "Thêm mục menu mới"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tiêu đề <span className="text-destructive">*</span></Label>
                    <Input 
                      value={itemTitle} 
                      onChange={(e) => setItemTitle(e.target.value)}
                      placeholder="VD: Phim Bộ"
                    />
                  </div>

                  <div>
                    <Label>URL</Label>
                    <Input 
                      value={itemUrl} 
                      onChange={(e) => setItemUrl(e.target.value)}
                      placeholder="VD: /danh-sach/phim-bo"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Để trống nếu chỉ là menu cha chứa menu con
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mở trong</Label>
                      <Select value={itemLinkTarget} onValueChange={setItemLinkTarget}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_self">Cùng cửa sổ</SelectItem>
                          <SelectItem value="_blank">Tab mới</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Icon (tùy chọn)</Label>
                      <Input 
                        value={itemIcon} 
                        onChange={(e) => setItemIcon(e.target.value)}
                        placeholder="VD: film, tv, home"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>CSS Class (tùy chọn)</Label>
                    <Input 
                      value={itemCssClass} 
                      onChange={(e) => setItemCssClass(e.target.value)}
                      placeholder="VD: text-primary font-bold"
                    />
                  </div>

                  {menuItems && menuItems.filter(i => !i.parent_id && i.id !== editingItem?.id).length > 0 && (
                    <div>
                      <Label>Menu cha (tùy chọn)</Label>
                      <Select value={itemParentId || "none"} onValueChange={(v) => setItemParentId(v === "none" ? null : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn menu cha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không có (menu gốc)</SelectItem>
                          {menuItems
                            .filter(i => !i.parent_id && i.id !== editingItem?.id)
                            .map(item => (
                              <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => saveItemMutation.mutate()} 
                      disabled={!itemTitle || saveItemMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingItem ? "Cập nhật" : "Thêm mục"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowItemDialog(false);
                        resetItemForm();
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
