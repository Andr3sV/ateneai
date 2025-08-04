"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Users, 
  UserPlus, 
  Building2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Plus,
  Instagram,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  Filter,
  Edit,
  Check,
  X
} from "lucide-react"
import { getApiUrl, logMigrationEvent } from '@/config/features'

// Types
interface Contact {
  id: number
  name: string
  phone: string
  email?: string
  status: 'Lead' | 'MQL' | 'Client' | null
  country: string
  instagram_url: string
  instagram_id?: string
  instagram_followers?: string
  created_at: string
  last_interaction?: string
}

interface ContactsMetrics {
  totalContacts: number
  totalLeads: number
  totalMQLs: number
  totalClients: number
  contactsWithPhone: number
  contactsWithEmail: number
  contactsWithInstagram: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

type StatusFilter = 'all' | 'Lead' | 'MQL' | 'Client'

// Country flags mapping
const getCountryFlag = (country: string): string => {
  if (!country) return '🌍'
  
  // ISO country codes and common variants
  const flags: Record<string, string> = {
    // ISO codes
    'ES': '🇪🇸', 'CO': '🇨🇴', 'MX': '🇲🇽', 'AR': '🇦🇷', 'PE': '🇵🇪',
    'CL': '🇨🇱', 'VE': '🇻🇪', 'EC': '🇪🇨', 'BO': '🇧🇴', 'PY': '🇵🇾',
    'UY': '🇺🇾', 'BR': '🇧🇷', 'US': '🇺🇸', 'CA': '🇨🇦', 'FR': '🇫🇷',
    'DE': '🇩🇪', 'IT': '🇮🇹', 'GB': '🇬🇧', 'PT': '🇵🇹', 'NL': '🇳🇱',
    'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'NO': '🇳🇴', 'SE': '🇸🇪',
    'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺',
    'RO': '🇷🇴', 'BG': '🇧🇬', 'GR': '🇬🇷', 'TR': '🇹🇷', 'RU': '🇷🇺',
    'UA': '🇺🇦', 'CN': '🇨🇳', 'JP': '🇯🇵', 'IN': '🇮🇳', 'KR': '🇰🇷',
    'TH': '🇹🇭', 'VN': '🇻🇳', 'SG': '🇸🇬', 'MY': '🇲🇾', 'ID': '🇮🇩',
    'PH': '🇵🇭', 'TW': '🇹🇼', 'HK': '🇭🇰', 'ZA': '🇿🇦', 'NG': '🇳🇬',
    'EG': '🇪🇬', 'MA': '🇲🇦', 'KE': '🇰🇪', 'GH': '🇬🇭', 'TN': '🇹🇳',
    'DZ': '🇩🇿', 'AU': '🇦🇺', 'NZ': '🇳🇿',
    
    // Common country names (fallback)
    'Spain': '🇪🇸', 'Colombia': '🇨🇴', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷',
    'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪', 'Ecuador': '🇪🇨',
    'Brazil': '🇧🇷', 'United States': '🇺🇸', 'USA': '🇺🇸', 'Canada': '🇨🇦',
    'France': '🇫🇷', 'Germany': '🇩🇪', 'Italy': '🇮🇹', 'United Kingdom': '🇬🇧',
    'UK': '🇬🇧', 'Portugal': '🇵🇹'
  }
  
  // Direct lookup
  if (flags[country]) return flags[country]
  
  // Case-insensitive lookup
  const upperCountry = country.toUpperCase()
  if (flags[upperCountry]) return flags[upperCountry]
  
  return '🌍'
}

// Status badge styling
const getStatusBadgeStyle = (status: Contact['status']) => {
  switch (status) {
    case 'Lead':
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
    case 'MQL':
      return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
    case 'Client':
      return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
  }
}

export default function ContactsPage() {
  const router = useRouter()
  const authenticatedFetch = useAuthenticatedFetch()
  
  // State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [metrics, setMetrics] = useState<ContactsMetrics>({
    totalContacts: 0,
    totalLeads: 0,
    totalMQLs: 0,
    totalClients: 0,
    contactsWithPhone: 0,
    contactsWithEmail: 0,
    contactsWithInstagram: 0
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  // Filters and search
  const [searchValue, setSearchValue] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(false)
  
  // Inline editing
  const [editingCell, setEditingCell] = useState<{contactId: number, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  
  // New contact modal
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'Lead' as Contact['status'],
    country: '',
    instagram_url: ''
  })

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      logMigrationEvent('Contact metrics fetch', { statusFilter })
      const data = await authenticatedFetch(getApiUrl('contacts/metrics'))
      if (data.success) {
        setMetrics({
          totalContacts: data.data.totalContacts || 0,
          totalLeads: data.data.totalLeads || 0,
          totalMQLs: data.data.totalMQLs || 0,
          totalClients: data.data.totalClients || 0,
          contactsWithPhone: data.data.contactsWithPhone || 0,
          contactsWithEmail: data.data.contactsWithEmail || 0,
          contactsWithInstagram: data.data.contactsWithInstagram || 0
        })
      }
    } catch (error) {
      console.error('Error fetching contacts metrics:', error)
    }
  }, [authenticatedFetch, statusFilter])

  // Fetch contacts
  const fetchContacts = useCallback(async (page = 1, phoneFilter = '', statusFilterParam = statusFilter) => {
    setLoading(true)
    try {
      const limit = 20
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      if (phoneFilter) {
        params.append('phone', phoneFilter)
      }
      
      if (statusFilterParam !== 'all') {
        params.append('status', statusFilterParam)
      }

      logMigrationEvent('Contacts fetch', { page, limit, search: phoneFilter, status: statusFilterParam })
      const data = await authenticatedFetch(getApiUrl(`contacts?${params}`))
      
      if (data.success) {
        setContacts(data.data || [])
        setPagination(data.pagination || {
          page: page,
          limit: limit,
          total: data.data?.length || 0,
          totalPages: Math.ceil((data.data?.length || 0) / limit)
        })
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, statusFilter])

  // Effects
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  useEffect(() => {
    fetchContacts(1, searchPhone, statusFilter)
  }, [searchPhone, statusFilter, fetchContacts])

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchPhone(searchValue)
  }

  const handlePageChange = (newPage: number) => {
    fetchContacts(newPage, searchPhone, statusFilter)
  }

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value)
  }

  const handleContactClick = (contactId: number) => {
    router.push(`/contacts/${contactId}`)
  }

  // Inline editing handlers
  const startEditing = (contactId: number, field: string, currentValue: string) => {
    setEditingCell({ contactId, field })
    setEditValue(currentValue || '')
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    
    try {
      console.log('🔄 Saving edit:', { 
        contactId: editingCell.contactId, 
        field: editingCell.field, 
        value: editValue 
      })
      
      const data = await authenticatedFetch(getApiUrl(`contacts/${editingCell.contactId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [editingCell.field]: editValue
        })
      })
      
      if (data.success) {
        console.log('✅ Edit saved successfully')
        // Update local state
        setContacts(prev => prev.map(contact => 
          contact.id === editingCell.contactId 
            ? { ...contact, [editingCell.field]: editValue }
            : contact
        ))
        cancelEditing()
        
        // Refresh metrics if status changed
        if (editingCell.field === 'status') {
          fetchMetrics()
        }
      } else {
        console.error('❌ Failed to save edit:', data)
        alert('Error saving changes: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Error updating contact:', error)
    }
  }

  // New contact handlers
  const handleCreateContact = async () => {
    try {
      console.log('🔄 Creating contact:', newContact)
      const data = await authenticatedFetch(getApiUrl('contacts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      })
      
      console.log('📡 Create contact response:', data)
      
      if (data.success) {
        console.log('✅ Contact created successfully:', data.data)
        setIsNewContactModalOpen(false)
        setNewContact({
          name: '',
          phone: '',
          email: '',
          status: 'Lead',
          country: '',
          instagram_url: ''
        })
        fetchContacts(1, searchPhone, statusFilter)
        fetchMetrics()
      } else {
        console.error('❌ Failed to create contact:', data)
        alert('Error creating contact: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Error creating contact:', error)
      alert('Error creating contact: ' + error.message)
    }
  }

  // Format helpers
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-'
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInstagramHandle = (url: string) => {
    if (!url) return null
    const match = url.match(/instagram\.com\/([^/?]+)/)
    return match ? `@${match[1]}` : url
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage and track your customer relationships
          </p>
        </div>
        
        <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Contact</DialogTitle>
              <DialogDescription>
                Add a new contact to your database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <Select
                  value={newContact.status || 'Lead'}
                  onValueChange={(value) => setNewContact(prev => ({ ...prev, status: value as Contact['status'] }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="MQL">MQL</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="country" className="text-right">Country</Label>
                <Input
                  id="country"
                  value={newContact.country}
                  onChange={(e) => setNewContact(prev => ({ ...prev, country: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="instagram" className="text-right">Instagram</Label>
                <Input
                  id="instagram"
                  value={newContact.instagram_url}
                  onChange={(e) => setNewContact(prev => ({ ...prev, instagram_url: e.target.value }))}
                  className="col-span-3"
                  placeholder="https://instagram.com/username"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateContact}>
                Create Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalContacts}</div>
            <p className="text-xs text-muted-foreground">
              All contacts in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              New prospects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MQLs</CardTitle>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMQLs}</div>
            <p className="text-xs text-muted-foreground">
              Marketing qualified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline">Search</Button>
            </form>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="MQL">MQL</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(searchPhone || statusFilter !== 'all') && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchValue('')
                  setSearchPhone('')
                  setStatusFilter('all')
                }}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Contacts 
              {(searchPhone || statusFilter !== 'all') && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({pagination.total} filtered)
                </span>
              )}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {pagination.total} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading contacts...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-lg font-medium mb-2">No contacts found</div>
              <div className="text-muted-foreground mb-4">
                {searchPhone || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms.' 
                  : 'Get started by creating your first contact.'
                }
              </div>
              {(!searchPhone && statusFilter === 'all') && (
                <Button onClick={() => setIsNewContactModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Contact
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Instagram</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Country</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact, index) => (
                      <tr 
                        key={contact.id}
                        className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                        }`}
                        onClick={(e) => {
                          // Only navigate if not editing and not clicking on interactive elements
                          if (!editingCell && !e.defaultPrevented) {
                            handleContactClick(contact.id)
                          }
                        }}
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div>
                              <div className="font-medium">
                                {contact.name || 'Unnamed Contact'}
                              </div>
                              {contact.email && (
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                            {formatPhoneNumber(contact.phone)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {editingCell?.contactId === contact.id && editingCell?.field === 'status' ? (
                            <div className="flex items-center space-x-2">
                              <Select value={editValue} onValueChange={setEditValue}>
                                <SelectTrigger className="h-8 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Lead">Lead</SelectItem>
                                  <SelectItem value="MQL">MQL</SelectItem>
                                  <SelectItem value="Client">Client</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  saveEdit()
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancelEditing()
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              className={`cursor-pointer ${getStatusBadgeStyle(contact.status)}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(contact.id, 'status', contact.status || '')
                              }}
                            >
                              {contact.status || 'Unknown'}
                            </Badge>
                          )}
                        </td>

                        {/* Instagram */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            {contact.instagram_url ? (
                              <a
                                href={contact.instagram_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-600 hover:text-pink-800 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Instagram className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>

                        {/* Country */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            <span className="text-lg">{getCountryFlag(contact.country)}</span>
                          </div>
                        </td>

                        {/* Last Activity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {contact.last_interaction ? formatDate(contact.last_interaction) : 'No activity'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}