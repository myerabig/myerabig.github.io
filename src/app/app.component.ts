import {Observable} from 'rxjs';

import {Component, OnInit} from '@angular/core';

import {GoogleSheetsDbService} from 'ng-google-sheets-db';

import {environment} from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  books$: Observable<Book[]> | undefined;
  bookList: Book[] = [];
  searchText = '';
  searchResults: Book[] = [];
  searchResultsBackup: Book[] = [];
  searchResultsCurrentPage: Book[] = [];

  sortedTitleAuthor = 0;
  sortedLevel = 0;

  displayModal = false;
  modalBook: Book = {
    title: '',
    author: '',
    category: '',
    series: '',
    level: 0,
    points: 0,
    topics: '',
    pages: 0,
    year: 0,
    isbn: '',
    summary: '',
    image: '',
    color: ''
  };

  pageNumbers: number[] = [];
  currentPage = 1;

  displayFilterModal = false;
  filterCount = 0;
  filterCategoryValues = ['fiction', 'nonfiction'];
  filterMinLevel = 1;
  filterMaxLevel = 10;

  constructor(private googleSheetsDbService: GoogleSheetsDbService) {
  }

  ngOnInit(): void {
    // Gets book data from Google Sheet
    this.books$ = this.googleSheetsDbService.get<Book>(
      environment.books.spreadsheetId, environment.books.worksheetId, bookAttributesMapping);

    // Stores book data in array
    this.books$.subscribe(books => this.bookList = books);
  }

  // Display modal for clicked book
  handleModal(book: Book): void {
    this.displayModal = true;
    this.modalBook = book;
  }

  // Display modal for filters
  handleFilterModal(): void {
    this.displayFilterModal = true;
  }

  // Apply current search
  search(): void {
    // Clear search results and currently displayed elements
    this.searchResults = [];
    this.searchResultsCurrentPage = [];

    // Sets search content to all lowercase and splits words into array elements
    const search = this.searchText.toLowerCase().replace(/[^\w\s]/g, '');
    const searchArr = search.split(' ');

    // If search bar isn't empty
    if (this.searchText.length > 0) {
      this.bookList.forEach(book => {
        // Set title and author to all lowercase
        const title = book.title.toLowerCase().replace(/[^\w\s]/g, '');
        const author = book.author.toLowerCase().replace(/[^\w\s]/g, '');

        // Checks to see if any search words are in this book's title or author
        let match = true;
        searchArr.every(word => {
          if (!title.includes(word) && !author.includes(word)) {
            match = false;
            return false;
          }
          return true;
        });

        // Add to search results array if search matches
        if (match) {
          this.searchResults.push(book);
        }
      });
    } else {
      this.clearSearch();
    }

    // Create a backup array of search results in original order
    this.searchResultsBackup = this.searchResults.map(obj => ({...obj}));

    // Re-apply current sort to new search result array
    if (this.sortedTitleAuthor !== 0) {
      this.sortedTitleAuthor--;
      this.sortTitleAuthor();
    } else if (this.sortedLevel !== 0) {
      this.sortedLevel--;
      this.sortLevel();
    }

    // Generate array of page numbers
    this.pageNumbers = Array.from(Array(Math.ceil(this.searchResults.length / 5)).keys()).map(x => ++x);

    // Reset to first page and populate currently displayed results
    this.currentPage = 1;
    this.populateCurrentPage();

    // Set page number 1 on bottom to show as selected
    this.cleanNumberStyles(document.getElementsByClassName('current-page')[0]);
    const el = document.getElementsByClassName('page-number')[0];
    if (el) {
      el.classList.add('current-page');
    }
  }

  // Completely reset all searches and sorts on X click or empty search bar
  clearSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    this.searchResultsBackup = [];
    this.searchResultsCurrentPage = [];
    this.pageNumbers = [];
    this.currentPage = 1;
    this.sortedTitleAuthor = 0;
    this.sortedLevel = 0;
  }

  // Sort based on title/author column
  sortTitleAuthor(): void {
    // Un-set level sort
    this.sortedLevel = 0;

    // Undo sort if already been sorted twice
    this.sortedTitleAuthor++;
    if (this.sortedTitleAuthor > 2) {
      this.sortedTitleAuthor = 0;
    }

    if (this.sortedTitleAuthor === 0) {
      // Revert to original sort
      this.searchResults = this.searchResultsBackup.map(obj => ({...obj}));
    } else if (this.sortedTitleAuthor === 1) {
      // Sort ascending
      this.searchResults.sort((a, b) => (a.title > b.title) ? 1 : (a.title === b.title) ? ((a.author > b.author) ? 1 : -1) : -1);
    } else if (this.sortedTitleAuthor === 2) {
      // Sort descending
      this.searchResults.sort((a, b) => (a.title < b.title) ? 1 : (a.title === b.title) ? ((a.author < b.author) ? 1 : -1) : -1);
    }

    // Re-populate current page's items
    this.populateCurrentPage();
  }

  // Sort based on level column
  sortLevel(): void {
    // Unset title and author sort
    this.sortedTitleAuthor = 0;

    // Undo sort if already been sorted twice
    this.sortedLevel++;
    if (this.sortedLevel > 2) {
      this.sortedLevel = 0;
    }

    if (this.sortedLevel === 0) {
      // Revert to original sort
      this.searchResults = this.searchResultsBackup.map(obj => ({...obj}));
    } else if (this.sortedLevel === 1) {
      // Sort ascending
      this.searchResults.sort((a, b) => (a.level > b.level) ? 1 : -1);
    } else if (this.sortedLevel === 2) {
      // Sort descending
      this.searchResults.sort((a, b) => (a.level < b.level) ? 1 : -1);
    }

    // Re-populate current page's items
    this.populateCurrentPage();
  }

  // Navigate to next/previous page
  pageArrow(direction: number): void {
    if (direction < 0 && this.currentPage > 1) {
      const el = document.getElementsByClassName('current-page')[0].previousElementSibling;
      this.cleanNumberStyles(document.getElementsByClassName('current-page')[0]);
      if (el) {
        el.classList.add('current-page');
      }

      this.currentPage--;
      this.populateCurrentPage();
    } else if (direction > 0 && this.currentPage < this.pageNumbers.length) {
      const el = document.getElementsByClassName('current-page')[0].nextElementSibling;
      this.cleanNumberStyles(document.getElementsByClassName('current-page')[0]);
      if (el) {
        el.classList.add('current-page');
      }

      this.currentPage++;
      this.populateCurrentPage();
    }
  }

  // Remove additional styles from page numbers
  cleanNumberStyles(e: any): void {
    for (let i = 1; i < this.pageNumbers.length + 1; i++) {
      let el = null;
      if (e.target) {
        el = e.target.parentNode.children[i];
      } else {
        el = e.parentNode.children[i];
      }

      if (el.classList.contains('current-page')) {
        el.classList.remove('current-page');
      }
    }
  }

  // Navigate to certain page number
  pageNumber(e: any, page: number): void {
    this.cleanNumberStyles(e);
    this.currentPage = page;
    e.target.classList.add('current-page');
    this.populateCurrentPage();
  }

  // Fill in current page items
  populateCurrentPage(): void {
    this.searchResultsCurrentPage = [];

    for (let i = (this.currentPage - 1) * 5; i < this.searchResults.length && i < (this.currentPage * 5); i++) {
      this.searchResultsCurrentPage.push(this.searchResults[i]);
    }
  }
}

const bookAttributesMapping = {
  title: 'Title',
  author: 'Author',
  category: 'Category',
  series: 'Series',
  level: 'Level',
  points: 'points',
  topics: 'Topic(s)',
  pages: 'Pages',
  year: 'Year Published',
  isbn: 'ISBN',
  summary: 'Summary',
  image: 'Image URL',
  color: 'Color'
};

interface Book {
  title: string;
  author: string;
  category: string;
  series: string;
  level: number;
  points: number;
  topics: string;
  pages: number;
  year: number;
  isbn: string;
  summary: string;
  image: string;
  color: string;
}

