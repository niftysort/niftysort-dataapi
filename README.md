
# API Server for Amazon Customer Reviews

## Created by Sanath Mullapudi

### Uses amazon api and web scrapping to attain customer reviews and preforms analysis.


Future Plans/ToDo List (Updated March 3rd, 2016):
// rewrite code functionally, using ES6, with modularity, with error checking
// emphasis on error checking
// emphasis on modular code
// takes on multiple attributes for user query
// deals with half start rating for customer review ==> better Regex
// eventually use IBM Watson for natural language processing
// Use browseNodeIds as one option only and user can still do custom search
// Show user options for potential children for browseNodeIds the user selects
// Update feature for the top sellers product category on our server, since amazon updates hourly =>
   great way to bring in event emitters knowledge and show animation on frontend
// Eventually deal with ones that lack a price, right off the bat due to price listed on 'cart add'
// Eventually better scrapping to get back 3 prices offered on Amazon Best Seller
   better than 'var price = $element.find('.zg_price strong.price').text();'
// Worry about duplicate products in database with same ASIN etc => let multiple categories reference same product
   then you can pull from more than just best sellers/ etc everything
