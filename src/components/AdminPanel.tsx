import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Clock, 
  Tag, 
  Layers, 
  Package, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  KeyRound,
  Lock,
  Loader2,
  FileSpreadsheet,
  Download,
  Upload,
  Image as ImageIcon,
  Database,
  Sparkles,
  Copy,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal
} from 'lucide-react';
import { Product, Category, Coupon, StoreSettings, OrderRecord, SellMode, AnimalType } from '../types';
import { 
  saveProduct, 
  removeProduct, 
  clearAllProducts,
  saveCategory, 
  removeCategory, 
  saveCoupon, 
  removeCoupon, 
  saveSettings,
  updateOrderStatus,
  getStoredAdminPassword
} from '../services/storeService';
import { downloadTemplateExcel, exportProductsToExcel } from '../services/excelService';
import { ImportExcelModal } from './ImportExcelModal';
import { 
  getActiveFirebaseConfig, 
  isUsingCustomFirebaseConfig, 
  saveActiveFirebaseConfig, 
  resetToDefaultFirebaseConfig 
} from '../lib/firebase';
import { 
  parseFirebaseConfigInput, 
  FirebaseAppletConfig 
} from '../services/firebaseConfigParser';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  settings: StoreSettings;
  orders: OrderRecord[];
  onSettingsUpdated?: (settings: StoreSettings) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  coupons,
  settings,
  orders,
  onSettingsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'coupons' | 'settings' | 'orders' | 'database'>('products');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Product edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormError, setProductFormError] = useState('');
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [adminOnlyPromo, setAdminOnlyPromo] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // In-app Delete Confirmation state (avoids window.confirm which gets blocked in iframes)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'category' | 'product' | 'coupon' | 'all_products';
    id: string;
    name: string;
  } | null>(null);

  // Category new state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  // Coupon new state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMin, setNewCouponMin] = useState(50);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Settings form state: initialize with current settings
  const [formSettings, setFormSettings] = useState<StoreSettings>({ ...settings });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);

  // Database Tab state (Request 6)
  const [currentConfig, setCurrentConfig] = useState<FirebaseAppletConfig>(getActiveFirebaseConfig());
  const [hasCustomDb, setHasCustomDb] = useState<boolean>(isUsingCustomFirebaseConfig());
  const [dbInputText, setDbInputText] = useState('');
  const [parsedConfig, setParsedConfig] = useState<FirebaseAppletConfig | null>(null);
  const [formattedJsonOutput, setFormattedJsonOutput] = useState('');
  const [parseError, setParseError] = useState('');
  const [dbSuccessMsg, setDbSuccessMsg] = useState('');
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [copiedDbJson, setCopiedDbJson] = useState(false);

  // Sync formSettings when settings prop updates
  useEffect(() => {
    if (settings) {
      setFormSettings({ ...settings });
    }
    if (isOpen) {
      setCurrentConfig(getActiveFirebaseConfig());
      setHasCustomDb(isUsingCustomFirebaseConfig());
    }
  }, [settings, isOpen]);

  // Reset image load error when editing product image changes
  useEffect(() => {
    setImageLoadError(false);
  }, [editingProduct?.imageUrl]);

  if (!isOpen) return null;

  // Retrieve the currently registered password: from settings or direct localStorage fallback
  const getActiveAdminPassword = (): string => {
    try {
      const cached = localStorage.getItem('pet_delivery_settings_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.adminPassword && String(parsed.adminPassword).trim()) {
          return String(parsed.adminPassword).trim();
        }
      }
    } catch {}
    return (settings.adminPassword && String(settings.adminPassword).trim()) || getStoredAdminPassword() || '1234';
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    const activePassword = getActiveAdminPassword();

    // STRICT AUTHENTICATION: Only accept the currently configured password!
    // Never allow bypass with '1234' or 'admin' once the merchant changed their password!
    if (entered === activePassword) {
      setIsAuthenticated(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Senha incorreta! Digite a senha cadastrada no painel.');
    }
  };

  // Database Tab handlers (Request 6)
  const handleDbInputChange = (text: string) => {
    setDbInputText(text);
    setDbSuccessMsg('');
    if (!text.trim()) {
      setParsedConfig(null);
      setFormattedJsonOutput('');
      setParseError('');
      return;
    }

    const result = parseFirebaseConfigInput(text);
    if (result.success && result.config && result.formattedJson) {
      setParsedConfig(result.config);
      setFormattedJsonOutput(result.formattedJson);
      setParseError('');
    } else {
      setParsedConfig(null);
      setFormattedJsonOutput('');
      setParseError(result.error || 'Formato inválido. Insira o objeto com apiKey, projectId, appId.');
    }
  };

  const handleFillSampleDb = () => {
    const sample = `{\n  apiKey: "AIzaSyCWdj8oW7mBlIloEJdyXN3_N4btg203FlM",\n  authDomain: "lojabase1-9a4d4.firebaseapp.com",\n  projectId: "lojabase1-9a4d4",\n  storageBucket: "lojabase1-9a4d4.firebasestorage.app",\n  messagingSenderId: "1094336366479",\n  appId: "1:1094336366479:web:f7acb05482ccf71707adfa",\n  measurementId: "G-9L3Z7GYPQD"\n};`;
    handleDbInputChange(sample);
  };

  const handleCopyDbJson = () => {
    if (!formattedJsonOutput) return;
    navigator.clipboard.writeText(formattedJsonOutput);
    setCopiedDbJson(true);
    setTimeout(() => setCopiedDbJson(false), 2500);
  };

  const handleDownloadDbJson = () => {
    if (!formattedJsonOutput) return;
    const blob = new Blob([formattedJsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firebase-applet-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDatabaseConfig = async () => {
    if (!parsedConfig) return;
    setIsSavingDb(true);
    setDbSuccessMsg('');

    try {
      // 1. Save in active localStorage
      saveActiveFirebaseConfig(parsedConfig);

      // 2. Persist to disk /firebase-applet-config.json via server endpoint
      let fileSavedOnDisk = false;
      try {
        const response = await fetch('/api/save-firebase-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedConfig, null, 2),
        });
        if (response.ok) {
          fileSavedOnDisk = true;
        }
      } catch (e) {
        console.warn('File save API note:', e);
      }

      setCurrentConfig(parsedConfig);
      setHasCustomDb(true);
      setDbSuccessMsg(
        fileSavedOnDisk
          ? '✓ Sucesso! O arquivo firebase-applet-config.json foi atualizado no disco e o banco ativado!'
          : '✓ Sucesso! Configuração gravada e ativada no sistema!'
      );
    } catch (err: any) {
      setParseError(err.message || 'Erro ao salvar novo banco de dados.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleRestoreDefaultDatabase = async () => {
    resetToDefaultFirebaseConfig();
    try {
      const response = await fetch('/api/save-firebase-config');
      if (response.ok) {
        const diskConfig = await response.json();
        setCurrentConfig(diskConfig);
      }
    } catch {}
    setHasCustomDb(false);
    setDbSuccessMsg('✓ Banco de dados restaurado para a configuração inicial! Recarregue a página.');
  };

  // Product Actions
  const handleStartNewProduct = () => {
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || 'cat-granel',
      imageUrl: '',
      sellMode: 'bag_and_bulk',
      bagPrice: 150,
      bagWeightKg: 15,
      bagVariations: [
        { id: `bv-${Date.now()}-10`, weightKg: 10, price: 115 },
        { id: `bv-${Date.now()}-15`, weightKg: 15, price: 150 },
        { id: `bv-${Date.now()}-20`, weightKg: 20, price: 190 },
      ],
      bulkPricePerKg: 12.5,
      unitPrice: 15,
      unitLabel: 'unidade',
      stockBags: 10,
      stockKg: 50,
      stockUnits: 20,
      inStock: true,
      isFeatured: false,
      isOnSale: false,
      promoDiscountText: '',
      animalType: 'dog',
      animalTypes: ['dog'],
      createdAt: new Date().toISOString(),
    };
    setEditingProduct(newProd);
    setIsNewProduct(true);
  };

  const handleAddBagVariation = () => {
    if (!editingProduct) return;
    const currentVars = editingProduct.bagVariations && editingProduct.bagVariations.length > 0
      ? [...editingProduct.bagVariations]
      : (editingProduct.bagPrice ? [{ id: `bv-${Date.now()}-0`, weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice }] : []);
    
    currentVars.push({
      id: `bv-${Date.now()}-${currentVars.length + 1}`,
      weightKg: 20,
      price: 180,
    });

    setEditingProduct({
      ...editingProduct,
      bagVariations: currentVars,
      bagPrice: currentVars[0]?.price || editingProduct.bagPrice,
      bagWeightKg: currentVars[0]?.weightKg || editingProduct.bagWeightKg,
    });
  };

  const handleUpdateBagVariation = (index: number, field: 'weightKg' | 'price', val: number) => {
    if (!editingProduct) return;
    const currentVars = editingProduct.bagVariations && editingProduct.bagVariations.length > 0
      ? [...editingProduct.bagVariations]
      : (editingProduct.bagPrice ? [{ id: `bv-${Date.now()}-0`, weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice }] : []);

    if (currentVars[index]) {
      currentVars[index] = { ...currentVars[index], [field]: val };
      setEditingProduct({
        ...editingProduct,
        bagVariations: currentVars,
        bagPrice: currentVars[0]?.price,
        bagWeightKg: currentVars[0]?.weightKg,
      });
    }
  };

  const handleRemoveBagVariation = (index: number) => {
    if (!editingProduct || !editingProduct.bagVariations) return;
    const updated = editingProduct.bagVariations.filter((_, i) => i !== index);
    setEditingProduct({
      ...editingProduct,
      bagVariations: updated,
      bagPrice: updated[0]?.price,
      bagWeightKg: updated[0]?.weightKg,
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name.trim()) {
      setProductFormError('Por favor informe o nome do produto.');
      return;
    }
    setProductFormError('');
    setIsSavingProduct(true);
    await saveProduct(editingProduct);
    setIsSavingProduct(false);
    setEditingProduct(null);
    setIsNewProduct(false);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation;
    setDeleteConfirmation(null);
    try {
      if (type === 'category') {
        await removeCategory(id);
      } else if (type === 'product') {
        await removeProduct(id);
      } else if (type === 'coupon') {
        await removeCoupon(id);
      } else if (type === 'all_products') {
        await clearAllProducts();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Category Actions
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
      icon: 'Package',
      sortOrder: categories.length + 1,
    };
    await saveCategory(newCat);
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (catId: string) => {
    setIsDeletingCat(true);
    try {
      await removeCategory(catId);
    } catch (err) {
      console.error('Delete category error:', err);
    } finally {
      setIsDeletingCat(false);
      setDeletingCatId(null);
    }
  };

  // Coupon Actions
  const handleAddCoupon = async () => {
    if (!newCouponCode.trim()) return;
    const newCoup: Coupon = {
      id: `coup-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: newCouponValue,
      minOrderValue: newCouponMin,
      isActive: true,
      description: newCouponDesc.trim() || `${newCouponValue}${newCouponType === 'percentage' ? '%' : ' R$'} de desconto`,
    };
    await saveCoupon(newCoup);
    setNewCouponCode('');
    setNewCouponDesc('');
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    await saveCoupon({ ...coupon, isActive: !coupon.isActive });
  };

  // Settings Actions: Save all store configurations
  const handleSaveSettingsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      const updated = {
        ...formSettings,
        adminPassword: formSettings.adminPassword?.trim() || '1234'
      };
      await saveSettings(updated);
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
      setSaveSuccessMsg('✓ Todas as configurações e nova senha foram salvas com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erro ao salvar as configurações. Tente novamente.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-4 border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">Área do Lojista</h2>
              <p className="text-xs text-stone-300">
                Gerencie catálogo, rações por saco/kg, cupons, horários e pedidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Password-Only Lock Screen */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-sm mx-auto w-full my-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-xl">Acesso Exclusivo por Senha</h3>
              <p className="text-xs text-stone-500 mt-1">
                Digite a senha de administrador da loja para acessar o painel.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="Senha do lojista (padrão: 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center py-3 px-4 rounded-xl border border-stone-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-base font-bold outline-none"
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-rose-600 text-xs font-semibold">{pinError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-700/20 active:scale-98"
              >
                Entrar no Painel
              </button>
            </form>

            <p className="text-[11px] text-stone-400">
              Digite a senha definida no painel. (Padrão inicial do sistema: <strong>1234</strong>)
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 py-2 shrink-0">
              {[
                { id: 'products', label: 'Produtos & Rações', icon: <Package className="w-4 h-4" /> },
                { id: 'categories', label: 'Categorias', icon: <Layers className="w-4 h-4" /> },
                { id: 'coupons', label: 'Cupons de Desconto', icon: <Tag className="w-4 h-4" /> },
                { id: 'settings', label: 'Horários & Loja', icon: <Clock className="w-4 h-4" /> },
                { id: 'orders', label: 'Pedidos Recebidos', icon: <ShoppingBag className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setEditingProduct(null);
                  }}
                  className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              
              {/* TAB 1: PRODUTOS */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  {editingProduct ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                        <h3 className="font-extrabold text-stone-900 text-base">
                          {isNewProduct ? 'Cadastrar Novo Produto' : 'Editar Produto'}
                        </h3>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Nome do Produto:
                          </label>
                          <input
                            type="text"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            placeholder="Ex: Ração Golden Special Adultos"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold bg-white outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Categoria:
                          </label>
                          <select
                            value={editingProduct.categoryId}
                            onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white outline-none focus:border-blue-500"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Pet Type Multi-Selector for filtering (Hidden if hidePetFilters is active) */}
                      {!formSettings.hidePetFilters && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-stone-700">
                              Tipo de Pet (Pode marcar mais de um):
                            </label>
                          <span className="text-[11px] text-blue-700 font-semibold">
                            Selecione todos que se aplicam (ex: Cães e Gatos juntos)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'dog', label: 'Cães', emoji: '🐕' },
                            { id: 'cat', label: 'Gatos', emoji: '🐈' },
                            { id: 'bird', label: 'Pássaros', emoji: '🦜' },
                            { id: 'fish', label: 'Peixes', emoji: '🐠' },
                            { id: 'other', label: 'Outros Pets', emoji: '🐾' },
                          ].map((pet) => {
                            const currentPets: string[] = (editingProduct.animalTypes && editingProduct.animalTypes.length > 0)
                              ? editingProduct.animalTypes
                              : editingProduct.animalType
                                ? [editingProduct.animalType]
                                : ['dog'];
                            const isSelected = currentPets.includes(pet.id);

                            return (
                              <button
                                key={pet.id}
                                type="button"
                                onClick={() => {
                                  let nextPets: AnimalType[];
                                  if (isSelected) {
                                    if (currentPets.length <= 1) {
                                      // Keep at least one selected
                                      return;
                                    }
                                    nextPets = currentPets.filter(p => p !== pet.id) as AnimalType[];
                                  } else {
                                    nextPets = [...(currentPets as AnimalType[]), pet.id as AnimalType];
                                  }
                                  setEditingProduct({
                                    ...editingProduct,
                                    animalTypes: nextPets,
                                    animalType: nextPets[0] || 'dog',
                                  });
                                }}
                                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                                }`}
                              >
                                <span>{pet.emoji}</span>
                                <span>{pet.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                          <span className="font-medium">Categorizado para:</span>
                          {((editingProduct.animalTypes && editingProduct.animalTypes.length > 0)
                            ? editingProduct.animalTypes
                            : [editingProduct.animalType || 'dog']
                          ).map((pId) => (
                            <span key={pId} className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                              {pId === 'dog' && '🐕 Cães'}
                              {pId === 'cat' && '🐈 Gatos'}
                              {pId === 'bird' && '🦜 Pássaros'}
                              {pId === 'fish' && '🐠 Peixes'}
                              {pId === 'other' && '🐾 Outros'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                          Descrição detalhada:
                        </label>
                        <textarea
                          rows={2}
                          value={editingProduct.description}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          placeholder="Benefícios, indicação de porte, ingredientes..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Sell Mode Selector */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          Modalidade de Venda:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'bag_and_bulk', label: 'Saco E a Granel' },
                            { id: 'bulk_only', label: 'Apenas a Granel' },
                            { id: 'bag_only', label: 'Apenas Saco Fechado' },
                            { id: 'unit', label: 'Item Unitário' },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, sellMode: mode.id as SellMode })}
                              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                editingProduct.sellMode === mode.id
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Pricing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-stone-200">
                        {(editingProduct.sellMode === 'bag_and_bulk' || editingProduct.sellMode === 'bulk_only') && (
                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                              Preço do Kg a Granel (R$):
                            </label>
                            <input
                              type="number"
                              step="0.10"
                              value={editingProduct.bulkPricePerKg ?? ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, bulkPricePerKg: parseFloat(e.target.value) || 0 })}
                              placeholder="14.90"
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                            />
                          </div>
                        )}

                        {(editingProduct.sellMode === 'bag_and_bulk' || editingProduct.sellMode === 'bag_only') && (
                          <div className="col-span-1 sm:col-span-2 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-stone-800">
                                Variações de Sacos Fechados (ex: 10kg, 15kg, 20kg):
                              </label>
                              <button
                                type="button"
                                onClick={handleAddBagVariation}
                                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Adicionar Tamanho</span>
                              </button>
                            </div>

                            {/* Variations Rows */}
                            <div className="space-y-2">
                              {((editingProduct.bagVariations && editingProduct.bagVariations.length > 0)
                                ? editingProduct.bagVariations
                                : [{ id: 'bv-default', weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice || 150 }]
                              ).map((variation, vIndex) => (
                                <div
                                  key={variation.id || vIndex}
                                  className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200"
                                >
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                                      Peso (Kg):
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={variation.weightKg}
                                      onChange={(e) => handleUpdateBagVariation(vIndex, 'weightKg', parseFloat(e.target.value) || 0)}
                                      placeholder="15"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                                      Preço do Saco (R$):
                                    </label>
                                    <input
                                      type="number"
                                      step="0.50"
                                      value={variation.price}
                                      onChange={(e) => handleUpdateBagVariation(vIndex, 'price', parseFloat(e.target.value) || 0)}
                                      placeholder="150.00"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white text-blue-700"
                                    />
                                  </div>

                                  {(editingProduct.bagVariations && editingProduct.bagVariations.length > 1) && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBagVariation(vIndex)}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 mt-3.5 transition-colors"
                                      title="Remover tamanho"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {editingProduct.sellMode === 'unit' && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">
                                Preço Unitário (R$):
                              </label>
                              <input
                                type="number"
                                step="0.10"
                                value={editingProduct.unitPrice ?? ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                                placeholder="12.90"
                                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">
                                Rótulo (ex: frasco 500ml, pct):
                              </label>
                              <input
                                type="text"
                                value={editingProduct.unitLabel || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, unitLabel: e.target.value })}
                                placeholder="unidade"
                                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Stock, Highlights & Promotion */}
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-stone-700">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-stone-200">
                          <input
                            type="checkbox"
                            checked={editingProduct.inStock}
                            onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Em Estoque (Ativo)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-stone-200">
                          <input
                            type="checkbox"
                            checked={editingProduct.isFeatured || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span>Destacar "Mais Pedido"</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 text-rose-700">
                          <input
                            type="checkbox"
                            checked={editingProduct.isOnSale || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, isOnSale: e.target.checked })}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="font-extrabold flex items-center gap-1">
                            🔥 Produto em PROMOÇÃO
                          </span>
                        </label>
                      </div>

                      {/* Custom Promotion Label when on sale */}
                      {editingProduct.isOnSale && (
                        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <label className="text-xs font-extrabold text-rose-800 flex items-center gap-1 shrink-0">
                            🏷️ Texto da Etiqueta de Promoção:
                          </label>
                          <input
                            type="text"
                            value={editingProduct.promoDiscountText || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, promoDiscountText: e.target.value })}
                            placeholder="Ex: OFERTA, 15% OFF, PREÇO BAIXO..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs bg-white font-semibold outline-none focus:border-rose-500"
                          />
                        </div>
                      )}

                      {/* Image Input and Live Preview */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                          <span>Foto do Produto (Link URL):</span>
                          {editingProduct.imageUrl?.trim() && (
                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                              ✓ Link inserido (Pré-visualização ativa)
                            </span>
                          )}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex-1 w-full space-y-1.5">
                            <input
                              type="url"
                              value={editingProduct.imageUrl || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                              placeholder="Cole o link da foto (ex: https://...)"
                              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white outline-none focus:border-blue-500 font-medium"
                            />
                            <p className="text-[11px] text-stone-400">
                              Cole o link direto da imagem (JPG, PNG ou WEBP) para visualizar como ficará no catálogo.
                            </p>
                          </div>

                          {/* Live Image Preview Card */}
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 relative shadow-xs">
                            {editingProduct.imageUrl?.trim() ? (
                              !imageLoadError ? (
                                <>
                                  <img
                                    src={editingProduct.imageUrl}
                                    alt="Pré-visualização do produto"
                                    className="w-full h-full object-contain p-1"
                                    onError={() => setImageLoadError(true)}
                                  />
                                  <span className="absolute bottom-1 right-1 bg-stone-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                    Preview
                                  </span>
                                </>
                              ) : (
                                <div className="text-center p-2 text-rose-500">
                                  <AlertTriangle className="w-6 h-6 mx-auto stroke-1 mb-1 text-rose-400" />
                                  <span className="text-[10px] font-semibold leading-tight block">Link inacessível</span>
                                  <span className="text-[9px] text-stone-400 block mt-0.5">Imagem não carregou</span>
                                </div>
                              )
                            ) : (
                              <div className="text-center p-2 text-stone-400">
                                <ImageIcon className="w-6 h-6 mx-auto stroke-1 mb-1 text-stone-300" />
                                <span className="text-[10px] font-medium leading-tight block">Sem imagem</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {productFormError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{productFormError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveProduct}
                        disabled={isSavingProduct}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-700/20"
                      >
                        {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSavingProduct ? 'Salvando...' : 'Salvar Produto no Catálogo'}</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={adminProductSearch}
                            onChange={(e) => setAdminProductSearch(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-white outline-none focus:border-blue-500 w-full max-w-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setAdminOnlyPromo(!adminOnlyPromo)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                              adminOnlyPromo
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <span>🔥</span>
                            <span>Apenas Promoções</span>
                            <span className={`text-[10px] px-1.5 rounded-full font-black ${adminOnlyPromo ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'}`}>
                              {products.filter(p => p.isOnSale).length}
                            </span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                          {/* Botão Baixar Modelo */}
                          <button
                            type="button"
                            onClick={downloadTemplateExcel}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                            title="Baixar planilha modelo do Excel (.xlsx) com exemplos prontos de preenchimento"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Baixar Modelo Excel</span>
                          </button>

                          {/* Botão Importar Planilha */}
                          <button
                            type="button"
                            onClick={() => setIsImportExcelOpen(true)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                            title="Importar produtos em lote a partir do Excel ou CSV"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-700" />
                            <span>Importar Planilha</span>
                          </button>

                          {/* Botão Exportar Catálogo Atual */}
                          {products.length > 0 && (
                            <button
                              type="button"
                              onClick={() => exportProductsToExcel(products, categories)}
                              className="bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                              title="Exportar todos os produtos cadastrados atualmente para o Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-stone-600" />
                              <span className="hidden sm:inline">Exportar Excel</span>
                            </button>
                          )}

                          {/* Botão Limpar Catálogo (Desativado / Inativo temporariamente) */}
                          {products.length > 0 && (
                            <button
                              type="button"
                              disabled
                              className="bg-stone-100 text-stone-400 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60 select-none"
                              title="Opção desativada temporariamente"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                              <span className="hidden sm:inline">Limpar Catálogo</span>
                            </button>
                          )}

                          <button
                            onClick={handleStartNewProduct}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Novo Produto</span>
                          </button>
                        </div>
                      </div>

                      {products.length === 0 ? (
                        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-8 text-center my-3">
                          <Package className="w-10 h-10 stroke-1 text-stone-400 mx-auto mb-2" />
                          <h4 className="font-extrabold text-stone-700 text-sm">Nenhum produto cadastrado</h4>
                          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                            O banco de dados está vazio. Você pode cadastrar produtos manualmente clicando em "Novo Produto", baixar o modelo ou importar sua planilha Excel com fotos e variações.
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleStartNewProduct}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Cadastrar Primeiro Produto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsImportExcelOpen(true)}
                              className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                            >
                              <Upload className="w-4 h-4 text-blue-600" />
                              <span>Importar via Excel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {products
                            .filter((p) => {
                              if (adminOnlyPromo && !p.isOnSale) return false;
                              if (adminProductSearch.trim()) {
                                const q = adminProductSearch.toLowerCase();
                                return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                              }
                              return true;
                            })
                            .map((prod) => (
                            <div
                              key={prod.id}
                              className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-stone-300"
                            >
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-12 h-12 rounded-lg object-contain bg-white p-0.5 border border-stone-200 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                                    {prod.name}
                                  </h4>
                                  {!formSettings.hidePetFilters && ((prod.animalTypes && prod.animalTypes.length > 0) ? prod.animalTypes : [prod.animalType || 'dog']).map((at) => (
                                    <span key={at} className="bg-stone-100 border border-stone-200 text-stone-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                                      {at === 'dog' && '🐕 Cão'}
                                      {at === 'cat' && '🐈 Gato'}
                                      {at === 'bird' && '🦜 Pássaro'}
                                      {at === 'fish' && '🐠 Peixe'}
                                      {at === 'other' && '🐾 Outro'}
                                    </span>
                                  ))}
                                  {prod.isOnSale && (
                                    <span className="bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                                      🔥 {prod.promoDiscountText || 'Promoção'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                  <span>
                                    {prod.sellMode === 'bag_and_bulk' && 'Saco & Granel'}
                                    {prod.sellMode === 'bulk_only' && 'Apenas Granel'}
                                    {prod.sellMode === 'bag_only' && 'Apenas Saco'}
                                    {prod.sellMode === 'unit' && 'Unitário'}
                                  </span>
                                  <span>•</span>
                                  <span className={prod.inStock ? 'text-blue-700 font-bold' : 'text-rose-600 font-bold'}>
                                    {prod.inStock ? 'Em estoque' : 'Esgotado'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingProduct({ ...prod });
                                    setIsNewProduct(false);
                                  }}
                                  className="p-2 text-stone-500 hover:text-blue-700 hover:bg-stone-100 rounded-lg transition-colors"
                                  title="Editar produto"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmation({ type: 'product', id: prod.id, name: prod.name })}
                                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir produto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CATEGORIAS */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da nova categoria (ex: Medicamentos, Roedores...)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {categories.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                        Nenhuma categoria cadastrada. Cadastre uma nova acima!
                      </div>
                    ) : (
                      categories.map((cat) => (
                        deletingCatId === cat.id ? (
                          <div
                            key={cat.id}
                            className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
                          >
                            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Excluir categoria <strong className="text-rose-950">"{cat.name}"</strong>?</span>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                disabled={isDeletingCat}
                                onClick={() => setDeletingCatId(null)}
                                className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 rounded-lg transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingCat}
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="px-3.5 py-1.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isDeletingCat ? 'Excluindo...' : 'Sim, Excluir'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={cat.id}
                            className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:border-stone-300 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {cat.sortOrder}
                              </span>
                              <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                                {cat.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDeletingCatId(cat.id)}
                              className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all"
                              title="Excluir categoria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CUPONS DE DESCONTO */}
              {activeTab === 'coupons' && (
                <div className="space-y-5">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                    <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                      Cadastrar Novo Cupom
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Código do Cupom:</label>
                        <input
                          type="text"
                          placeholder="EX: PROMO10"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs uppercase font-extrabold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Tipo de Desconto:</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Valor do Desconto:</label>
                        <input
                          type="number"
                          value={newCouponValue}
                          onChange={(e) => setNewCouponValue(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Pedido Mínimo (R$):</label>
                        <input
                          type="number"
                          value={newCouponMin}
                          onChange={(e) => setNewCouponMin(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCoupon}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ativar Novo Cupom</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-600 block">Cupons Cadastrados:</span>
                    {coupons.map((c) => (
                      <div
                        key={c.id}
                        className={`bg-white border rounded-xl p-3.5 flex items-center justify-between gap-3 ${
                          c.isActive ? 'border-blue-300' : 'border-stone-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-stone-900 text-sm tracking-wider bg-stone-100 px-2 py-0.5 rounded">
                              {c.code}
                            </span>
                            <span className="text-xs font-bold text-blue-700">
                              {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `R$ ${c.discountValue.toFixed(2)} OFF`}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.isActive ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-600'
                            }`}>
                              {c.isActive ? 'Ativo' : 'Desativado'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {c.description || `Mínimo de R$ ${c.minOrderValue?.toFixed(2) || '0,00'}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              c.isActive
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                            }`}
                          >
                            {c.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmation({ type: 'coupon', id: c.id, name: c.code })}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir cupom"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HORÁRIOS & CONFIGURAÇÕES DA LOJA */}
              {activeTab === 'settings' && (
                <div className="space-y-5">
                  {saveSuccessMsg && (
                    <div className="p-3.5 bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                      <Check className="w-5 h-5 text-blue-700 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Password Management */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-700" />
                      <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                        Senha de Acesso do Lojista
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600">
                      Defina a senha que você usa para acessar este painel. Ao salvar, apenas esta nova senha cadastrada será aceita para entrar.
                    </p>
                    <div className="max-w-xs space-y-1.5">
                      <input
                        type="text"
                        value={formSettings.adminPassword !== undefined ? formSettings.adminPassword : ''}
                        onChange={(e) => setFormSettings({ ...formSettings, adminPassword: e.target.value })}
                        placeholder="Digite a nova senha (ex: 1234, loja2025...)"
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs font-bold bg-white text-stone-900 outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                        <span>Senha ativa no momento:</span>
                        <span className="font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                          {getActiveAdminPassword()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controle de Visibilidade: Tipo de Pet, Filtros e Banner de Granel */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                        <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                          Ocultar Opção Tipo de Pet e Informativo de Granel
                        </h4>
                        {formSettings.hidePetFilters && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider">
                            Ocultação Ativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                        Ao ativar este botão, o sistema <strong>oculta a opção Tipo de Pet</strong> (Cães, Gatos, etc.) no cadastro/edição de produtos na área do lojista, <strong>remove os filtros de animais da página principal</strong> e também <strong>oculta o informativo "Ração a Granel por Kg ou Reais"</strong> em todos os modos de visualização (celular e computador).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormSettings({ ...formSettings, hidePetFilters: !formSettings.hidePetFilters })}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 ${
                        formSettings.hidePetFilters
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
                      }`}
                    >
                      {formSettings.hidePetFilters ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Ocultado (Ativo)</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 text-stone-500" />
                          <span>Visível (Padrão)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Store Name & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Nome da Loja:
                      </label>
                      <input
                        type="text"
                        value={formSettings.storeName}
                        onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        WhatsApp para receber pedidos (com DDD):
                      </label>
                      <input
                        type="tel"
                        placeholder="5511999998888"
                        value={formSettings.whatsappNumber}
                        onChange={(e) => setFormSettings({ ...formSettings, whatsappNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Endereço da Loja:
                    </label>
                    <input
                      type="text"
                      value={formSettings.address}
                      onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium outline-none"
                    />
                  </div>

                  {/* Mode override */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-stone-800">
                      Status da Loja no Momento:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'auto', label: 'Horário Automático' },
                        { id: 'forced_open', label: 'Forçar Aberta Agora' },
                        { id: 'forced_closed', label: 'Forçar Fechada Agora' },
                      ].map((sm) => (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => setFormSettings({ ...formSettings, scheduleMode: sm.id as any })}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            formSettings.scheduleMode === sm.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {sm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Horários de Atendimento Semanal */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
                    <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>Horários de Atendimento Semanal</span>
                      <span className="text-[11px] font-normal text-stone-500 lowercase">(abertura e fechamento)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Segunda a Sexta */}
                      <div className="p-3 bg-white rounded-xl border border-stone-200">
                        <span className="font-bold block text-stone-800 mb-1.5">Segunda a Sexta-feira:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formSettings.weekdayOpen}
                            onChange={(e) => setFormSettings({ ...formSettings, weekdayOpen: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                          />
                          <span className="text-stone-400 font-medium">até</span>
                          <input
                            type="time"
                            value={formSettings.weekdayClose}
                            onChange={(e) => setFormSettings({ ...formSettings, weekdayClose: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                          />
                        </div>
                      </div>

                      {/* Sábado */}
                      <div className="p-3 bg-white rounded-xl border border-stone-200">
                        <span className="font-bold block text-stone-800 mb-1.5">Sábado:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formSettings.saturdayOpen}
                            onChange={(e) => setFormSettings({ ...formSettings, saturdayOpen: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                          />
                          <span className="text-stone-400 font-medium">até</span>
                          <input
                            type="time"
                            value={formSettings.saturdayClose}
                            onChange={(e) => setFormSettings({ ...formSettings, saturdayClose: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Domingo com opção de ativar horário */}
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-stone-800 text-xs block">Domingo:</span>
                          <span className="text-[11px] text-stone-500">
                            {!formSettings.isSundayClosed 
                              ? 'Loja configurada para abrir no domingo' 
                              : 'Loja fechada aos domingos'}
                          </span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-xl border border-stone-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={!formSettings.isSundayClosed}
                            onChange={(e) => setFormSettings({ 
                              ...formSettings, 
                              isSundayClosed: !e.target.checked,
                              sundayOpen: formSettings.sundayOpen || '08:30',
                              sundayClose: formSettings.sundayClose || '12:30'
                            })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${!formSettings.isSundayClosed ? 'text-blue-700' : 'text-stone-600'}`}>
                            {!formSettings.isSundayClosed ? '✓ Atender no Domingo' : 'Fechado no Domingo'}
                          </span>
                        </label>
                      </div>

                      {!formSettings.isSundayClosed ? (
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                          <span className="text-xs font-bold text-blue-900 block">
                            Horário de Funcionamento no Domingo:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={formSettings.sundayOpen || '08:30'}
                              onChange={(e) => setFormSettings({ ...formSettings, sundayOpen: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-blue-300 font-bold bg-white text-stone-900 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <span className="text-stone-500 font-bold text-xs">até</span>
                            <input
                              type="time"
                              value={formSettings.sundayClose || '12:30'}
                              onChange={(e) => setFormSettings({ ...formSettings, sundayClose: e.target.value })}
                              className="px-2.5 py-1.5 rounded-lg border border-blue-300 font-bold bg-white text-stone-900 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <span className="text-[11px] text-blue-700 font-semibold ml-2 hidden sm:inline">
                              ({formSettings.sundayOpen || '08:30'} às {formSettings.sundayClose || '12:30'})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-stone-50 rounded-lg text-[11px] text-stone-500 italic border border-dashed border-stone-200">
                          A loja permanece fechada aos domingos. Para abrir no domingo e definir o horário, clique em "Atender no Domingo" acima.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Closed message customize */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Mensagem de Loja Fechada:
                    </label>
                    <textarea
                      rows={2}
                      value={formSettings.closedMessage}
                      onChange={(e) => setFormSettings({ ...formSettings, closedMessage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium outline-none"
                    />
                  </div>

                  {/* Delivery fees */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Taxa de Entrega Fixa (R$):
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        value={formSettings.fixedDeliveryFee}
                        onChange={(e) => setFormSettings({ ...formSettings, fixedDeliveryFee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Frete Grátis acima de (R$):
                      </label>
                      <input
                        type="number"
                        step="5"
                        value={formSettings.freeDeliveryThreshold}
                        onChange={(e) => setFormSettings({ ...formSettings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>

                  {/* Save button with clear feedback */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettingsSubmit()}
                    disabled={isSavingSettings}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all"
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Salvando Configurações...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Salvar Todas as Configurações da Loja</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 5: HISTÓRICO DE PEDIDOS */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-stone-600 block">
                    Pedidos salvos ({orders.length}):
                  </span>

                  {orders.length === 0 ? (
                    <div className="text-center p-8 text-stone-400 text-xs">
                      Nenhum pedido recebido ainda. Quando clientes enviarem pedidos pelo WhatsApp, o histórico aparecerá aqui!
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-stone-900 text-sm">
                              {ord.customerName}
                            </span>
                            <span className="text-xs text-stone-500 block">
                              WhatsApp: {ord.customerPhone} • {ord.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                            </span>
                          </div>
                          <span className="font-black text-blue-700 text-base">
                            R$ {ord.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                          <p className="font-semibold text-stone-800">Itens:</p>
                          <p>{ord.itemsSummary}</p>
                          {ord.notes && <p className="text-stone-500 mt-1 italic">Obs: {ord.notes}</p>}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-stone-400">
                            {new Date(ord.createdAt).toLocaleString('pt-BR')}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-stone-500">Status:</span>
                            <select
                              value={ord.status}
                              onChange={(e) => updateOrderStatus(ord.id, e.target.value as any)}
                              className="px-2 py-1 rounded-md border border-stone-300 font-bold text-xs bg-white"
                            >
                              <option value="novo">Novo</option>
                              <option value="preparando">Preparando</option>
                              <option value="saiu_entrega">Saiu para Entrega</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 6: BANCO DE DADOS (FIREBASE) */}
              {activeTab === 'database' && (
                <div className="space-y-5">
                  {/* Banner Informativo do Banco Conectado */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span>Banco de Dados Conectado no Momento:</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        hasCustomDb ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {hasCustomDb ? '✓ Banco Próprio Personalizado' : 'Banco Inicial da Loja'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-400 block font-bold">PROJECT ID</span>
                        <span className="font-mono font-bold text-stone-800 truncate block">{currentConfig.projectId}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-400 block font-bold">FIRESTORE DATABASE ID</span>
                        <span className="font-mono font-bold text-stone-800 truncate block">
                          {currentConfig.firestoreDatabaseId || '(default)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instruções e Campo de Inserção */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <span>Cole abaixo os dados do novo Banco de Dados (Firebase):</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleFillSampleDb}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Inserir exemplo (lojabase1-9a4d4)</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Você pode colar diretamente o objeto JavaScript ou JSON enviado. O sistema converterá automaticamente para a estrutura de <strong>firebase-applet-config.json</strong>.
                    </p>

                    <textarea
                      rows={6}
                      value={dbInputText}
                      onChange={(e) => handleDbInputChange(e.target.value)}
                      placeholder={`Cole aqui no formato:\n{\n  apiKey: "AIzaSy...",\n  authDomain: "lojabase1-9a4d4.firebaseapp.com",\n  projectId: "lojabase1-9a4d4",\n  storageBucket: "lojabase1-9a4d4.firebasestorage.app",\n  messagingSenderId: "1094336366479",\n  appId: "1:1094336366479:web:f7acb05482ccf71707adfa",\n  measurementId: "G-9L3Z7GYPQD"\n};`}
                      className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs bg-white text-stone-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Notificação de Erro */}
                  {parseError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {/* Notificação de Sucesso */}
                  {dbSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{dbSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 hover:bg-emerald-800 cursor-pointer"
                      >
                        Recarregar Loja Agora
                      </button>
                    </div>
                  )}

                  {/* Pré-visualização da Conversão para firebase-applet-config.json */}
                  {parsedConfig && formattedJsonOutput && (
                    <div className="space-y-2 p-3.5 bg-stone-900 text-white rounded-2xl border border-stone-800 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <Check className="w-4 h-4" />
                          <span>Convertido com Sucesso para firebase-applet-config.json:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyDbJson}
                            className="text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                          >
                            {copiedDbJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedDbJson ? 'Copiado!' : 'Copiar JSON'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadDbJson}
                            className="text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar Arquivo</span>
                          </button>
                        </div>
                      </div>

                      <pre className="font-mono text-[11px] leading-relaxed text-stone-300 bg-stone-950 p-3 rounded-xl overflow-x-auto max-h-48 border border-stone-800">
                        {formattedJsonOutput}
                      </pre>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveDatabaseConfig}
                      disabled={!parsedConfig || isSavingDb}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      {isSavingDb ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Atualizando Arquivo e Conexão...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar no Arquivo firebase-applet-config.json & Ativar</span>
                        </>
                      )}
                    </button>

                    {hasCustomDb && (
                      <button
                        type="button"
                        onClick={handleRestoreDefaultDatabase}
                        className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                        <span>Restaurar Banco de Dados Padrão Original</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* In-App Delete Confirmation Modal (100% reliable inside iframe) */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">Confirmar Exclusão</h4>
                <p className="text-[11px] text-stone-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200 leading-relaxed">
              Deseja realmente excluir{' '}
              {deleteConfirmation.type === 'category' && 'a categoria '}
              {deleteConfirmation.type === 'product' && 'o produto '}
              {deleteConfirmation.type === 'coupon' && 'o cupom '}
              {deleteConfirmation.type === 'all_products' && 'todos os itens: '}
              <strong className="text-stone-900 font-extrabold">"{deleteConfirmation.name}"</strong>?
            </p>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportExcelOpen}
        onClose={() => setIsImportExcelOpen(false)}
        categories={categories}
        existingProducts={products}
      />
    </div>
  );
};
