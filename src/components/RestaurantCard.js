import React  from 'react';
import PropTypes from 'prop-types';

class RestaurantCard extends React.PureComponent {
    render() {
        const { restaurant, image, compact } = this.props;
        return (
            <div style={compact ? {width: '22%'} : {}} className={'cardWrapper'}>
                <div className={'imageWrapper'}>
                    <img src={image} />
                </div>
                <div className={'descriptionWrapper'}>
                    <div style={{ height: '90px'}}>
                        <h3 className={'truncate name'}>{restaurant.name}</h3>
                        <p className={'truncate description'}>{restaurant.food_types.join(', ')}</p>
                    </div>
                    <div className={'textWrapper'}>
                        {
                            restaurant.ratings
                            ? <span className={'starRating'}>&#9733; {restaurant.ratings}</span>
                                : <span>&#9733; --</span>
                        }
                        <span className={'dot'}>&#183;</span>
                        <span>{restaurant.delivery_time}</span>
                        <span className={'dot'}>&#183;</span>
                        <span>{restaurant.price_for_two} FOR TWO</span>
                    </div>
                </div>
            </div>
        );
    }
}

RestaurantCard.propTypes = {
    restaurant: PropTypes.object,
    image: PropTypes.string,
};

export default RestaurantCard;
