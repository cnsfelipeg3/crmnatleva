import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenericSettingsListProps {
  title: string;
  tableName?: string;
  /** If no table, use local state with these defaults */
  defaultItems?: string[];
  backPath?: string;
}

export default function GenericSettingsList({
  title,
  defaultItems = [],
  backPath = "/settings",
}: GenericSettingsListProps) {
  const [items, setItems] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [newItem, setNewItem] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // For now, use localStorage to persist simple lists
    const stored = localStorage.getItem(`settings_${title}`);
    if (stored) {
      setItems(JSON.parse(stored));
    } else if (defaultItems.length > 0) {
      setItems(defaultItems);
      localStorage.setItem(`settings_${title}`, JSON.stringify(defaultItems));
    }
  }, [title]);

  const save = (newItems: string[]) => {
    setItems(newItems);
    localStorage.setItem(`settings_${title}`, JSON.stringify(newItems));
  };

  const handleAdd = () => {
    if (!newItem.trim()) return;
    if (items.includes(newItem.trim())) {
      toast({ title: "Item já existe", variant: "destructive" });
      return;
    }
    save([...items, newItem.trim()]);
    setNewItem("");
    setDialogOpen(false);
    toast({ title: "Adicionado!" });
  };

  const handleRemove = (item: string) => {
    save(items.filter(i => i !== item));
    toast({ title: "Removido!" });
  };

  const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{items.length} itens cadastrados</p>
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo {title.slice(0, -1)}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder={`Nome do ${title.toLowerCase().slice(0, -1)}`}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((item) => (
            <Card key={item} className="p-3 glass-card flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{item}</span>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(item)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
