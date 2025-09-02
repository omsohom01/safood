import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { donationService } from '@/services/firebaseService';
import { User } from '@/types';

interface NGO {
  id: string;
  name: string;
  organizationName: string;
}

interface NGOSelectionProps {
  user: User;
  onUpdate: (selectedNGOs: string[]) => void;
  onClose?: () => void; // Make optional for setup flow
}

export const NGOSelection: React.FC<NGOSelectionProps> = ({ user, onUpdate, onClose }) => {
  const [ngos, setNGOs] = useState<NGO[]>([]);
  const [selectedNGOs, setSelectedNGOs] = useState<string[]>(user.selectedNGOs || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNGOs();
  }, []);

  const loadNGOs = async () => {
    try {
      const allNGOs = await donationService.getAllNGOs();
      setNGOs(allNGOs);
    } catch (error) {
      console.error('Error loading NGOs:', error);
      Alert.alert('Error', 'Failed to load NGOs');
    } finally {
      setLoading(false);
    }
  };

  const toggleNGOSelection = (ngoId: string) => {
    setSelectedNGOs(prev => {
      if (prev.includes(ngoId)) {
        return prev.filter(id => id !== ngoId);
      } else {
        return [...prev, ngoId];
      }
    });
  };

  const handleSave = () => {
    onUpdate(selectedNGOs);
    if (onClose) {
      onClose();
    }
  };

  const renderNGOItem = ({ item }: { item: NGO }) => {
    const isSelected = selectedNGOs.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.ngoItem, isSelected && styles.selectedNGO]}
        onPress={() => toggleNGOSelection(item.id)}
      >
        <View style={styles.ngoInfo}>
          <Text style={[styles.ngoName, isSelected && styles.selectedText]}>
            {item.name}
          </Text>
          <Text style={[styles.ngoEmail, isSelected && styles.selectedText]}>
            {item.organizationName}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? '#007AFF' : '#666'}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading NGOs...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Select NGOs to Volunteer For</ThemedText>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ThemedText style={styles.subtitle}>
        Choose the NGOs you want to volunteer for. You'll receive pickup notifications when they claim donations.
      </ThemedText>

      {ngos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            No NGOs available at the moment
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={ngos}
          renderItem={renderNGOItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            Save Selection ({selectedNGOs.length} NGOs)
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  ngoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedNGO: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  ngoInfo: {
    flex: 1,
  },
  ngoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ngoEmail: {
    fontSize: 14,
    color: '#666',
  },
  selectedText: {
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
