# -*- coding: utf-8 -*-
"""
base layer functions for admin_include
"""

__author__ = [ 'yuan.wu' ]


import binascii
import copy
import datetime
import hashlib
import logging
import subprocess
import shlex
from random import randint
import Momo.base.collocation as coll_base
import Momo.base.admin_mongo as mongo
import Momo.base.admin_item as admin_item_base


MD5_ENCODE = 'UTF-8'


def calculate_id(url='', mall=''):
    """ calculate an id with the specified info
    """
    m = hashlib.sha1(url)
    m.digest()
    return '%si%s' % (mall, str(int(m.hexdigest(), base=16)))


def is_duplication(item={}, _id=None):
    """ check whether the input item is duplicated
    Args:
        item: (dict) a dict of item
        _id: (string) item id

    Returns:
        True if duplicated, otherwise None
    """
    mongo_db = mongo.get_mongo()
    if not _id:
        _id = calculate_id(item['url'], item['mall'])
    result = mongo_db.db['item'].find_one({'_id': _id}, fields=['_id'])
    if result:
        return True


def calculate_img_id(url):
    """calculate the image url to img id"""
    m = hashlib.sha1(url)
    return long(''.join(''.join(
        [binascii.b2a_hex(x) for x in m.digest()])[:15]), base=16)


def buautify_title(item_id=None, brand=''):
    """ save beautified title
    """
    commands = '/sugarlady/crawler/bin/procedure.sh common ItemTitleBeautifyProcedure --item %s' % (item_id.encode(MD5_ENCODE))
    if brand:
        commands += ' --brand %s' % (brand.encode(MD5_ENCODE))
    proc = subprocess.Popen(
        shlex.split(commands),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        close_fds=True
        )
    while proc.poll() == None:
        pass
    return proc.returncode


def save_image(item_id=None, url_list=[]):
    """ save item images
    Args:
        item_id: (string) item id
        url_list: (list) a list of item image url

    Returns:
        0: success, 10: empty id, 20: item not found, 30: image url missing, 40: save image error
    """
    if not item_id:
        return 10  # item id is mandatory
    mongo_db = mongo.get_mongo()
    item = mongo_db.db['item'].find_one({'_id': item_id})
    if not item:
        return 20  # no item found with the specified item id
    if url_list:
        item['pic_urls'] = url_list
        item['image_infos'] = [[calculate_img_id(x), [], [], False, x, 0] for x in item['pic_urls']]
        mongo_db.db['item'].update({'_id': item_id}, {'$set': {
            'image_infos': item['image_infos'],
            'pic_urls': item['pic_urls']}})
    commands = '/sugarlady/crawler/bin/procedure.sh common ImageReloader --item %s' % (item_id.encode(MD5_ENCODE))
    proc = subprocess.Popen(
        shlex.split(commands),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        close_fds=True
        )
    while proc.poll() == None:
        pass
    return proc.returncode


def add_item(item={}):
    """ add new item, return item_id
    """
    mongo_db = mongo.get_mongo()
    # online data
    # calculate fq2_category_ids
    item['fq2_category_ids'] = admin_item_base.get_complete_cat_ids(item['fq2_category_ids'])
    item['fq_category_ids'] = admin_item_base.get_fq_category_from_fq2(
        item['fq2_category_ids'], item['tags'])

    raw_item = copy.deepcopy(item)
    # calculate item id
    item['_id'] = calculate_id(item['url'], item.pop('mall'))
    # populate rnd_rank
    item['rnd_rank'] = randint(1, 10000000)
    # source
    item['source'] = 'zg'
    # set default value for eache meta list
    # here each meta list in image_infos consists of:
    # 0: 图片服务器上该图片ID, 1: list of 颜色名称, 2: list of 宽度高度, 3: 是否去除背景, 4: 图片背景亮度
    item['image_infos'] = [[calculate_img_id(x), [], [], False, x, 0] for x in item['pic_urls']]
    # raw data
    [raw_item.pop(c, None) for c in ('url', 'price', 'mall', 'seller_id', 'pic_urls')]
    [item.pop(c, None) for c in ('operator', 'crawl_time')]
    item['raw'] = raw_item

    editor_cols = ('color', 'color_tag', 'fq_category_ids', 'fq2_category_ids', 'fq_style', 'seasons', 'tags', 'title')
    item['editor'] = dict([(k, v) for k, v in item.items() if k in editor_cols])
    # Need some expert to confirm on specific fields, like the style tags.
    # item['editor']['verified_date'] = datetime.datetime.now()

    mongo_db.db['item'].insert(item)

    # save beautified title into raw.title
    buautify_title(item['_id'], item['brand'])

    # generate image_infos
    save_image(item['_id'])

    return item['_id']


def get_enabled_brand_names():
    """ Returns a sorted list of enabled brand names.
    """
    cur = mongo.get_mongo().db[mongo.CollectionNames.FQ_BRANDS].find(
        {'enabled.zg': 1}, fields=['_id', 'name'])
    return sorted([x['name'] for x in cur])


def get_mall_and_sellers():
    """ Get the mall and sellers data from manual data.
    """
    return mongo.get_mongo().get_manualdata('mallAndSeller')
