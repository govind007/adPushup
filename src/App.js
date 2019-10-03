import React  from 'react';
import LeftSideBar from './components/LeftSideBar';
import RestaurantCard from './components/RestaurantCard';
import Restaurants from './restaurantsService';
import { restaurants, restaurantImages } from './restaurants';

class App extends React.PureComponent {
    constructor() {
        super()
        this.rest = new Restaurants(restaurants)
        this.state = {
            activeCategoryIndex: 0,
            isSticky: true,
            showAllRestaurants: this.rest.getIntialVisibleRestaurantsCount(),
        };
        this.changeCategory = this.changeCategory.bind(this);
        this.showAllRestaurant = this.showAllRestaurant.bind(this);
        this.onWindowScroll = this.onWindowScroll.bind(this);
    }

    componentDidMount() {
        this.categoriesList = this.rest.getCategoriesList();
        this.lastScrollTop = 0;
        window.onscroll = this.onWindowScroll
    }

    changeCategory(activeCategoryIndex) {
        this.setState({
            activeCategoryIndex
        });
        document.getElementById(this.categoriesList[activeCategoryIndex]).scrollIntoView({
            behavior: "smooth",
            block:    "start",
        })
    }

    scrollToAllRestaurant() {
        document.getElementById('allRestaurants').scrollIntoView({
            behavior: "smooth",
            block:    "start",
        })
    }

    onWindowScroll() {
        const st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
        const { activeCategoryIndex } = this.state;
        const stateObj = {}
        const allResOffset = document.getElementById('allRestaurants').offsetTop;
        stateObj.isSticky = (window.scrollY < (allResOffset - 580))
        if (st > this.lastScrollTop){
            const nextCategory = this.categoriesList[activeCategoryIndex + 1];
            if (nextCategory) {
                const viewportOffset = document.getElementById(nextCategory).getBoundingClientRect();
                if (viewportOffset.top < 0) {
                    stateObj.activeCategoryIndex = activeCategoryIndex + 1
                }
            }
            // downscroll code
        } else {
            const prevCategory = this.categoriesList[activeCategoryIndex - 1];
            if (prevCategory) {
                const viewportOffset = document.getElementById(prevCategory).getBoundingClientRect();
                const allResOffset = document.getElementById('allRestaurants').offsetTop;
                if (viewportOffset.top > 0) {
                    stateObj.activeCategoryIndex = activeCategoryIndex - 1
                }
            }
            // upscroll code
        }
        this.setState(stateObj);
        this.lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    getIndex(index) {
        return index % 11;
    }

    showAllRestaurant(category) {
        const { showAllRestaurants } = this.state;
        this.setState({
            showAllRestaurants: this.rest.updateVisibleRestaurantsCount(Object.assign({}, showAllRestaurants), category)
        })
    }

    getCardView(restObj, i, category, total) {
        const { showAllRestaurants } = this.state;
        const currentCount = showAllRestaurants[category]
        if (i < currentCount) {
            return (
                <RestaurantCard
                    key={restObj.name}
                    restaurant={restObj}
                    image={restaurantImages[this.getIndex(i)]}
                />
            )
        } else if (currentCount !== total && i === currentCount) {
            return (
                <button onClick={() => this.showAllRestaurant(category)} className={'cardWrapper showMore'}>
                    +{total - i} MORE
                </button>
            )
        }
    }

    render() {
        const { activeCategoryIndex } = this.state;
        return (
          <div>
              <div className={'sidebarWrapper'}>
                <LeftSideBar
                    activeCategoryIndex={activeCategoryIndex}
                    changeCategory={this.changeCategory}
                    categoriesList={this.rest.getCategoriesListWithCount()}
                    allRestCount={this.rest.getAllRestaurantsCount()}
                    isSticky={this.state.isSticky}
                    scrollToAllRestaurant={this.scrollToAllRestaurant}
                />
              </div>
              <div className={'listWrapper'}>
                  {
                      this.rest.restaurants.map((restListObj, i) => {
                          return (
                              <div id={restListObj.category} key={restListObj.category}>
                                  <h3 className={'categoryHeading'}>{this.capitalizeFirstLetter(restListObj.category)}</h3>
                                  {
                                      restListObj.restaurantList.map((restObj, i) => (this.getCardView(restObj, i, restListObj.category, restListObj.restaurantList.length)))
                                  }
                              </div>
                          )
                      })
                  }
              </div>
              <div id={'allRestaurants'}>
                  <h3 style={{ textAlign: 'center', margin: '3rem 0' }} className={'categoryHeading'}>ALL RESTAURANTS</h3>
                  {
                      this.rest.getAllRestaurants().map((restObj, i) => (
                          <RestaurantCard
                              key={restObj.name}
                              compact
                              restaurant={restObj}
                              image={restaurantImages[this.getIndex(i)]}
                          />
                      ))

                  }
              </div>
          </div>
        );
    }
}

export default App;
