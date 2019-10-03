import React  from 'react';
import PropTypes from 'prop-types';
import RestaurantCard from "./RestaurantCard";

class LeftSideBar extends React.PureComponent {
    render() {
        const { categoriesList, activeCategoryIndex, allRestCount, isSticky  } = this.props;
        return (
            <div className={isSticky ? 'fixedBar sideBar' : 'sideBar'}>
                {
                    categoriesList.map((obj, i) => (
                        <button className={activeCategoryIndex === i ? 'activeCategory' : ''} onClick={() => this.props.changeCategory(i)} key={obj.category}>
                            <h4 style={{ margin: 0 }}>{obj.category}</h4>
                            <p style={{ margin: '4px 0 0', opacity: .8, fontSize: '12px' }}>{obj.count} OPTIONS</p>
                        </button>
                    ))
                }
                <button onClick={this.props.scrollToAllRestaurant}>
                    <h4 style={{ margin: 0 }}>SEE ALL</h4>
                    <p style={{ margin: '4px 0 0', opacity: .8, fontSize: '12px' }}>{allRestCount} OPTIONS</p>
                </button>
            </div>
        );
    }
}

LeftSideBar.propTypes = {
    activeCategoryIndex: PropTypes.number,
    changeCategory: PropTypes.func,
    categoriesList: PropTypes.array,
    allRestCount: PropTypes.number,
    scrollToAllRestaurant: PropTypes.func,
};

export default LeftSideBar;
