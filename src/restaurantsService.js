class Restaurants {
    constructor(restaurants) {
        this.restaurants = restaurants;
    }
    getRestaurantsByCategory(category) {
        const list = this.restaurants.find((obj) => (obj.category === category));
        return list.restaurantList;
    }
    getRestaurantsCount(category) {
        const list = this.restaurants.find((obj) => (obj.category === category));
        return list.restaurantList.length;
    }
    getAllRestaurantsCount() {
        return this.getAllRestaurants().length;
    }
    getAllRestaurants() {
        const list = this.restaurants.map((obj) => obj.restaurantList);
        return list.flat();
    }
    getCategoriesList() {
        return this.restaurants.map((obj) => obj.category)
    }
    getCategoriesOffset() {
        const categoryList = this.getCategoriesList();
        const obj = {};
        categoryList.forEach((category) => {
            obj[document.getElementById(category).offsetTop] = category
        });
        return obj;
    }
    getCategoriesListWithCount() {
        const categoryList = this.getCategoriesList();
        return categoryList.map((category) => ({
            category,
            count: this.getRestaurantsCount(category)
        }))
    }
    getIntialVisibleRestaurantsCount() {
        const categoryList = this.getCategoriesList();
        const obj = {};
        categoryList.forEach((category) => {
            obj[category] = Math.min(5, this.getRestaurantsCount(category))
        });
        return obj;
    }
    updateVisibleRestaurantsCount(countObj, category) {
        const count = countObj[category];
        countObj[category] = Math.min(count + 6, this.getRestaurantsCount(category))
        return countObj
    }
}

export default Restaurants
