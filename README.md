
# API Server for Amazon Customer Reviews

## Created by Sanath Mullapudi

### Uses amazon api and web scrapping to attain customer reviews and preforms analysis.


## Future Plans/ToDo List (Updated March 3rd, 2016):
- rewrite code functionally, using ES6, with modularity, with error checking
- emphasis on error checking
- emphasis on modular code
- takes on multiple attributes for user query
- deals with half start rating for customer review ==> better Regex
- eventually use IBM Watson for natural language processing
- Use browseNodeIds as one option only and user can still do custom search
- Show user options for potential children for browseNodeIds the user selects
- Update feature for the top sellers product category on our server, since amazon updates hourly =>
   great way to bring in event emitters knowledge and show animation on front-end
- Eventually deal with ones that lack a price, right off the bat due to price listed on 'cart add'
- Eventually better scrapping to get back 3 prices offered on Amazon Best Seller
   better than 'var price = $element.find('.zg_price strong.price').text();'
- Worry about duplicate products in database with same ASIN etc => let multiple categories reference same product
   then you can pull from more than just best sellers/ etc everything
- Add an update feature and Product model has Date Created, and Date Updated

## Future Implementations (Exciting):
- FrontEnd UI/UX experience:
  - Should the category not exist, allow both department query or custom query to populate database
  - User can watch data (products) come in (form of Materialize cards) which are populated with product info but will be missing reviews
  - UI/UX for products as they load should be fun tiles that animate as user moves around (transition all .5s!!!!)
  - User can click on card to see info coming in real time, as review come in they populate to the top!!!
  * Extra Cool: Template card is brought into main view, and its filler text gets rewritten in realtime but with animations to prevent choppy feel
- BackEnd:
  - Create API for everyone (JSON)
  - NPM Package? Contribute to D3 open source
  - Export to all charting libraries
  - Include keywords that come up from reviews frequently
  * IBM Watson for text analysis/ Other reputable natural language processing
- General:
  - Apply for Amazon Affiliate Program
  - Create Demo video to show product in use
  * Mobile version for in store use, to compare products off the shelf, NAME?: 'Off the shelf'
