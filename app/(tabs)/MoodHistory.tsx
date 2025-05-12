import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MoodHistory() {
  const navigation = useNavigation();
  const [history, setHistory] = useState([]);
  const [originalHistory, setOriginalHistory] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Function to delete a mood entry
  const deleteMood = (id) => {
    console.log('Delete mood entry:', id);

    Alert.alert('Delete Entry', 'Are you sure you want to delete this mood entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => {
          // Delete mood entry from API
          const deleteMoodEntry = async () => {
            try {
              const response = await fetch(`http://192.168.8.102:5000/emotions/${id}`, {
                method: 'DELETE',
              });
              const data = await response.json();
              console.log('Mood entry deleted:', data);

              // Update mood history list
              setHistory(history.filter(item => item._id !== id));
              setOriginalHistory(originalHistory.filter(item => item._id !== id));
            } catch (error) {
              console.error('Error deleting mood entry:', error);
            }
          }
          deleteMoodEntry();
        }
      }
    ]);
  };

  // Function to format MongoDB date object
  const formatDate = (dateObj) => {
    if (!dateObj) return 'Unknown date';

    // Check if it's a MongoDB date object
    if (dateObj.$date) {
      const date = new Date(dateObj.$date);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    // If it's a regular date string
    try {
      const date = new Date(dateObj);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return String(dateObj);
    }
  };

  // Function to safely parse date
  const parseDate = (dateObj) => {
    if (!dateObj) return null;
    
    try {
      // Handle MongoDB date object
      if (dateObj.$date) {
        return new Date(dateObj.$date);
      }
      // Handle regular date string or object
      return new Date(dateObj);
    } catch (e) {
      console.error('Error parsing date:', e);
      return null;
    }
  };

  // Filter functions
  const applyFilter = (filter) => {
    setSelectedFilter(filter);
    
    if (filter === 'all') {
      setHistory(originalHistory);
      setFilterModalVisible(false);
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    
    let filteredData = [];
    
    switch(filter) {
      case 'today': {
        console.log('Filtering by today:', today.toISOString());
        filteredData = originalHistory.filter(item => {
          const itemDate = parseDate(item.createdAt);
          if (!itemDate) return false;
          
          // Set time to beginning of day for comparison
          const itemDateStart = new Date(itemDate);
          itemDateStart.setHours(0, 0, 0, 0);
          
          const isSameDay = itemDateStart.getTime() === today.getTime();
          console.log('Item date:', itemDateStart.toISOString(), 'Today:', today.toISOString(), 'Is same day:', isSameDay);
          return isSameDay;
        });
        break;
      }
      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        console.log('Filtering by week, from:', weekAgo.toISOString());
        
        filteredData = originalHistory.filter(item => {
          const itemDate = parseDate(item.createdAt);
          if (!itemDate) return false;
          return itemDate >= weekAgo;
        });
        break;
      }
      case 'month': {
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        console.log('Filtering by month, from:', monthAgo.toISOString());
        
        filteredData = originalHistory.filter(item => {
          const itemDate = parseDate(item.createdAt);
          if (!itemDate) return false;
          return itemDate >= monthAgo;
        });
        break;
      }
      default:
        filteredData = originalHistory;
    }
    
    console.log(`Filter applied: ${filter}. Found ${filteredData.length} items out of ${originalHistory.length}`);
    setHistory(filteredData);
    setFilterModalVisible(false);
  };

  useEffect(() => {
    // Fetch mood history from API
    const fetchMoodHistory = async () => {
      try {
        const response = await fetch('http://192.168.8.102:5000/emotions');
        const data = await response.json();
        console.log('Fetched mood history:', data.length, 'items');
        
        // Log a sample date to debug
        if (data.length > 0) {
          console.log('Sample date format:', data[0].createdAt);
        }
        
        setHistory(data);
        setOriginalHistory(data);
      } catch (error) {
        console.error('Error fetching mood history:', error);
      }
    }
    fetchMoodHistory();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mood History</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter {selectedFilter !== 'all' ? `(${selectedFilter})` : ''}</Text>
        </TouchableOpacity>
      </View>

      {selectedFilter !== 'all' && (
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => applyFilter('all')}
        >
          <Text style={styles.clearFilterText}>Clear Filter</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={history}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.moodTile}
            onPress={() => navigation.navigate('MoodDetailScreen', { moodData: item })}
          >
            <Image source={{ uri: item.image_url }} style={styles.moodImage} />
            <View style={styles.textContainer}>
              <Text style={styles.moodText}>{item.mood}</Text>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMood(item._id)}>
              <Text style={styles.deleteText}>X</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No mood entries found for this filter</Text>
            {selectedFilter !== 'all' && (
              <TouchableOpacity 
                style={styles.showAllButton}
                onPress={() => applyFilter('all')}
              >
                <Text style={styles.showAllText}>Show All Entries</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filter by Date</Text>
            
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'all' && styles.selectedFilter]}
              onPress={() => applyFilter('all')}
            >
              <Text style={styles.filterOptionText}>All Entries</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'today' && styles.selectedFilter]}
              onPress={() => applyFilter('today')}
            >
              <Text style={styles.filterOptionText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'week' && styles.selectedFilter]}
              onPress={() => applyFilter('week')}
            >
              <Text style={styles.filterOptionText}>Last 7 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'month' && styles.selectedFilter]}
              onPress={() => applyFilter('month')}
            >
              <Text style={styles.filterOptionText}>Last 30 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  clearFilterButton: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  clearFilterText: {
    color: '#666',
  },
  moodTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  moodText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  showAllButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  showAllText: {
    color: 'white',
    fontWeight: '600',
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  filterOption: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    backgroundColor: '#F0F0F0',
  },
  selectedFilter: {
    backgroundColor: '#E1F0FF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  filterOptionText: {
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});