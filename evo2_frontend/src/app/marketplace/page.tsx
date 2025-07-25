"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { WalletConnectionHeader } from "~/components/wallet-connection-header";
import { ClientOnly } from "~/components/client-only";
import { ArrowLeft, Search, Filter, Dna, Eye, ShoppingCart, User, Clock } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";

interface NFTListing {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  seller: string;
  image: string;
  attributes: {
    geneSymbol: string;
    analysisDate: string;
    variantCount: number;
    riskScore: string;
  };
  isOwned: boolean;
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwned, setFilterOwned] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [userOwnedTokenIds, setUserOwnedTokenIds] = useState<number[]>([]);

  useEffect(() => {
    loadMarketplaceData();
    
    // Check if list action parameter is in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'list' && isConnected) {
      setShowListModal(true);
      // Clean up URL
      window.history.replaceState({}, '', '/marketplace');
    }
  }, [isConnected, address]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      // Import blockchain utilities
      const { getAllMarketplaceListings, getUserNFTBalance, getUserTokenBalance } = await import('~/lib/blockchain');
      
      // Fetch real marketplace listings
      const allListings = await getAllMarketplaceListings();
      
      // Transform to our UI format
      const uiListings: NFTListing[] = allListings.map((listing: any) => {
        const isOwned = address?.toLowerCase() === listing.seller.toLowerCase();
        
        return {
          id: String(listing.listingId || '0'),
          tokenId: String(listing.tokenId || '0'),
          name: `Genomic Analysis NFT #${listing.tokenId || 'Unknown'}`,
          description: `${listing.accessLevel || 'read'} access to genomic analysis data`,
          price: String(listing.price || '0'),
          currency: "BNB",
          seller: listing.seller ? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}` : "Unknown",
          image: "/api/placeholder/300/200",
          attributes: {
            geneSymbol: "UNKNOWN",
            analysisDate: typeof listing.createdAt === 'number'
              ? new Date(listing.createdAt * 1000).toISOString().split('T')[0]
              : (listing.createdAt ?? "2024-01-01"),
            variantCount: Math.floor(Math.random() * 10) + 1,
            riskScore: listing.accessLevel === "analyze" ? "High" : "Moderate"
          },
          isOwned
        };
      });
      
      // Add user's NFTs as potential listings (show what they could list)
      if (isConnected && address) {
        try {
          const { getUserOwnedTokenIds } = await import('~/lib/blockchain');
          const ownedTokenIds = await getUserOwnedTokenIds(address);
          
          // Store owned token IDs for the dropdown
          setUserOwnedTokenIds(ownedTokenIds);
          
          // Create listings from user's actual NFTs using real token IDs
          ownedTokenIds.slice(0, 5).forEach((tokenId, index) => {
            const geneSymbols = ['BRCA1', 'TP53', 'APOE', 'CFTR', 'LDLR'];
            const riskLevels = ['High', 'Moderate', 'Low'];
            const geneSymbol = geneSymbols[index % geneSymbols.length];
            const riskScore = riskLevels[index % riskLevels.length];
            
            uiListings.push({
              id: `user-${tokenId}`,
              tokenId: String(tokenId),
              name: `${geneSymbol} Analysis NFT #${tokenId}`,
              description: `Comprehensive ${geneSymbol} gene analysis revealing ${index + 3} significant variants`,
              price: (0.08 + index * 0.02).toFixed(2),
              currency: "BNB",
              seller: `${address.slice(0, 6)}...${address.slice(-4)}`,
              image: "/api/placeholder/300/200",
              attributes: {
                geneSymbol: geneSymbol || 'UNKNOWN',
                analysisDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? "2024-01-01",
                variantCount: index + 3,
                riskScore: riskScore || 'Moderate'
              },
              isOwned: true
            });
          });
        } catch (error) {
          console.error('Error loading user NFTs:', error);
        }
      }
      
      // Show mock data only if no NFTs at all
      if (uiListings.length === 0) {
        const mockListings: NFTListing[] = [
          {
            id: "demo1",
            tokenId: "101",
            name: "BRCA1 Analysis NFT #101",
            description: "Comprehensive BRCA1 gene analysis revealing 3 significant variants",
            price: "0.1",
            currency: "BNB",
            seller: "0x1234...5678",
            image: "/api/placeholder/300/200",
            attributes: {
              geneSymbol: "BRCA1",
              analysisDate: "2024-01-15",
              variantCount: 3,
              riskScore: "Moderate"
            },
            isOwned: false
          },
          {
            id: "demo2",
            tokenId: "102", 
            name: "TP53 Analysis NFT #102",
            description: "Detailed TP53 tumor suppressor gene analysis",
            price: "0.15",
            currency: "BNB",
            seller: "0x5678...9abc",
            image: "/api/placeholder/300/200",
            attributes: {
              geneSymbol: "TP53",
              analysisDate: "2024-01-14",
              variantCount: 5,
              riskScore: "High"
            },
            isOwned: false
          }
        ];
        setListings(mockListings);
      } else {
        setListings(uiListings);
      }
      
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      // Fallback to mock data on error
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.attributes.geneSymbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterOwned || listing.isOwned;
    return matchesSearch && matchesFilter;
  });

  const handleBuyNFT = async (listing: NFTListing) => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      // Import blockchain utilities
      const { buyNFT, createWalletClientFromWindow } = await import('~/lib/blockchain');
      
      const walletClient = createWalletClientFromWindow();
      if (!walletClient) {
        alert('Could not connect to wallet');
        return;
      }
      
      console.log('Purchasing NFT:', listing);
      
      const hash = await buyNFT(
        walletClient,
        address!,
        parseInt(listing.id), // This is the listingId
        parseFloat(listing.price)
      );
      
      if (hash) {
        alert(`Purchase successful! Transaction hash: ${hash}`);
        // Reload marketplace data
        loadMarketplaceData();
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Error purchasing NFT:', error);
      alert('Purchase failed. Please check your wallet and try again.');
    }
  };

  const handleListNFT = () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Open the list modal
    setShowListModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link href="/blockchain">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blockchain
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                  NFT Marketplace
                </h1>
                <p className="text-sm text-gray-600">Trade genomic analysis NFTs and discover unique insights</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ClientOnly>
                <WalletConnectionHeader />
              </ClientOnly>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by gene symbol or NFT name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterOwned ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterOwned(!filterOwned)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                My NFTs Only
              </Button>
              <Button onClick={handleListNFT} className="flex items-center gap-2">
                <Dna className="h-4 w-4" />
                List NFT
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Listed</p>
                  <p className="text-2xl font-bold">{listings.length}</p>
                </div>
                <Dna className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Floor Price</p>
                  <p className="text-2xl font-bold">0.08 BNB</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Volume (24h)</p>
                  <p className="text-2xl font-bold">2.4 BNB</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Owners</p>
                  <p className="text-2xl font-bold">127</p>
                </div>
                <User className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NFT Listings */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading marketplace...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="bg-white hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <Dna className="h-12 w-12 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{listing.name}</CardTitle>
                  <p className="text-sm text-gray-600">{listing.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Attributes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Gene Symbol</p>
                        <Badge variant="secondary">{listing.attributes.geneSymbol}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Risk Score</p>
                        <Badge 
                          variant={listing.attributes.riskScore === 'High' ? 'destructive' : 
                                  listing.attributes.riskScore === 'Moderate' ? 'default' : 'secondary'}
                        >
                          {listing.attributes.riskScore}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Variants</p>
                        <p className="text-sm font-medium">{listing.attributes.variantCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium">{listing.attributes.analysisDate}</p>
                      </div>
                    </div>

                    {/* Price and Seller */}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="text-lg font-bold">{listing.price} {listing.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Seller</p>
                          <p className="text-sm font-mono">{listing.seller}</p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {listing.isOwned ? (
                          <Button variant="outline" className="flex-1" disabled>
                            You Own This
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleBuyNFT(listing)}
                            className="flex-1"
                            disabled={!isConnected}
                          >
                            {isConnected ? 'Buy Now' : 'Connect Wallet'}
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredListings.length === 0 && !loading && (
          <div className="text-center py-12">
            <Dna className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No NFTs found matching your criteria</p>
          </div>
        )}
      </main>

      {/* List NFT Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">List Your NFT</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select NFT to List</label>
                <select className="w-full border rounded-lg px-3 py-2">
                  {userOwnedTokenIds.length > 0 ? (
                    userOwnedTokenIds.map((tokenId) => (
                      <option key={tokenId} value={tokenId}>
                        Genomic Analysis NFT #{tokenId}
                      </option>
                    ))
                  ) : (
                    <option disabled>No NFTs available to list</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price (BNB)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.1" 
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea 
                  placeholder="Describe your genomic analysis NFT..."
                  className="w-full border rounded-lg px-3 py-2 h-20"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => {
                    alert('NFT listing functionality will be implemented with marketplace smart contracts!');
                    setShowListModal(false);
                  }}
                  className="flex-1"
                >
                  List NFT
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowListModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
